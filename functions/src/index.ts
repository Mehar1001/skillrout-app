import { createHash } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app'; // Corrected: Import initializeApp directly
import { getAuth } from 'firebase-admin/auth';
import { DocumentReference, FieldValue, getFirestore } from 'firebase-admin/firestore'; // Corrected: Import getFirestore directly
import { logger } from 'firebase-functions';
import { CallableRequest, HttpsError, onCall } from 'firebase-functions/v2/https';
import { extractReceiptText } from './cloudVisionReceiptOcr.js';
import { parseReceiptText } from './receiptOcr.js';

// Initialize Firebase Admin SDK using the direct import
initializeApp(); // Called directly
const db = getFirestore(); // Corrected: Get Firestore instance directly
const auth = getAuth();

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const resolveCaller = async (uid: string) => {
  const ownerDoc = await db.doc(`owners/${uid}`).get();
  if (ownerDoc.exists) {
    return {
      ownerId: uid,
      role: 'owner' as const,
      name: ownerDoc.data()?.businessName || 'Owner',
      assignedStoreIds: [] as string[],
    };
  }
  const employeeDoc = await db.doc(`employees/${uid}`).get();
  const employee = employeeDoc.data();
  if (!employeeDoc.exists || employee?.active !== true || !employee?.ownerId) {
    throw new HttpsError('permission-denied', 'Your Skillrout account is not active.');
  }
  return {
    ownerId: employee.ownerId as string,
    role: 'employee' as const,
    name: employee.name || 'Employee',
    assignedStoreIds: (employee.assignedStoreIds || []) as string[],
  };
};

const validateBusinessDate = (businessDate: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(businessDate)) {
    throw new HttpsError('invalid-argument', 'Select a valid business date.');
  }
  const selected = new Date(`${businessDate}T00:00:00.000Z`);
  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const differenceDays = Math.floor((todayUtc - selected.getTime()) / 86400000);
  if (!Number.isFinite(selected.getTime()) || differenceDays < 0 || differenceDays > 7) {
    throw new HttpsError('invalid-argument', 'Business date must be today or within the previous seven days.');
  }
};

export const createEmployee = onCall(async (request: CallableRequest) => {
  const context = request.auth;
  const { email, name, password, assignedStoreIds } = request.data as {
    email: string;
    name: string;
    password: string;
    assignedStoreIds: string[];
  };

  if (!context || !context.uid) {
    throw new HttpsError('unauthenticated', 'You must be logged in to create an employee.');
  }

  const ownerId = context.uid;
  const ownerDoc = await db.collection('owners').doc(ownerId).get();
  if (!ownerDoc.exists) {
    throw new HttpsError('permission-denied', 'Only owners can create employees.');
  }

  if (!email || !email.trim() || !password || password.length < 6 || !name || !name.trim()) {
    throw new HttpsError('invalid-argument', 'Valid email, name, and password (6+ chars) are required.');
  }
  if (!Array.isArray(assignedStoreIds) || assignedStoreIds.length === 0) {
    throw new HttpsError('invalid-argument', 'Assign at least one store.');
  }

  const storeDocs = await Promise.all(
    assignedStoreIds.map(storeId => db.doc(`owners/${ownerId}/stores/${storeId}`).get())
  );
  if (storeDocs.some(storeDoc => !storeDoc.exists)) {
    throw new HttpsError('invalid-argument', 'One or more assigned stores do not exist.');
  }

  let userRecord;
  try {
    userRecord = await auth.createUser({
      email: email.trim(),
      password,
      displayName: name.trim(),
      emailVerified: true,
    });

    await db.collection('employees').doc(userRecord.uid).set({
      email: email.trim(),
      name: name.trim(),
      role: 'employee',
      ownerId,
      businessName: ownerDoc.data()?.businessName || '',
      assignedStoreIds,
      active: true,
      createdAt: FieldValue.serverTimestamp(),
    });

    return { uid: userRecord.uid, email: email.trim(), name: name.trim() };
  } catch (error: any) {
    if (userRecord) await auth.deleteUser(userRecord.uid);
    console.error('Error creating employee:', error);
    if (error.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'That email is already in use.');
    }
    throw new HttpsError('internal', 'Failed to create employee. Please try again.');
  }
});

const supportedImage = (image: Buffer, mimeType: string) => {
  if (mimeType === 'image/jpeg') return image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff;
  if (mimeType === 'image/png') return image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mimeType === 'image/webp') {
    return image.subarray(0, 4).toString() === 'RIFF' && image.subarray(8, 12).toString() === 'WEBP';
  }
  return false;
};

export const extractReceiptReadings = onCall(
  { region: 'us-central1', timeoutSeconds: 60, memory: '512MiB', maxInstances: 20 },
  async (request: CallableRequest) => {
    if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to read a receipt.');
    if (request.auth.token.email_verified !== true) {
      throw new HttpsError('failed-precondition', 'Verify your email before reading receipts.');
    }
    const { storeId, imageBase64, mimeType, targetMachineNumber } = request.data as {
      storeId: string;
      imageBase64: string;
      mimeType: string;
      targetMachineNumber?: string;
    };
    if (
      !storeId ||
      typeof imageBase64 !== 'string' ||
      typeof mimeType !== 'string' ||
      (targetMachineNumber !== undefined && (typeof targetMachineNumber !== 'string' || targetMachineNumber.length > 80))
    ) {
      throw new HttpsError('invalid-argument', 'Store and receipt image are required.');
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
      throw new HttpsError('invalid-argument', 'Use a JPEG, PNG, or WebP receipt image.');
    }
    if (imageBase64.length > 5_600_000 || !/^[A-Za-z0-9+/=]+$/.test(imageBase64)) {
      throw new HttpsError('invalid-argument', 'Receipt image is too large or invalid.');
    }
    const image = Buffer.from(imageBase64, 'base64');
    if (image.length === 0 || image.length > 4 * 1024 * 1024 || !supportedImage(image, mimeType)) {
      throw new HttpsError('invalid-argument', 'Receipt image is too large or its format is invalid.');
    }

    const caller = await resolveCaller(request.auth.uid);
    if (caller.role === 'employee' && !caller.assignedStoreIds.includes(storeId)) {
      throw new HttpsError('permission-denied', 'This store is not assigned to you.');
    }
    const store = await db.doc(`owners/${caller.ownerId}/stores/${storeId}`).get();
    if (!store.exists || store.data()?.active !== true) {
      throw new HttpsError('failed-precondition', 'Select an active store before reading a receipt.');
    }

    const imageHash = createHash('sha256').update(image).update(targetMachineNumber || '').digest('hex');
    const scanId = imageHash.slice(0, 20);
    const cacheRef = db.doc(`ocrCache/${request.auth.uid}_${imageHash}`);
    const cached = await cacheRef.get();
    const cachedData = cached.data();
    if (cached.exists && cachedData && cachedData.expiresAt?.toMillis?.() > Date.now() && cachedData.result) {
      return { ...cachedData.result, scanId, cached: true };
    }

    const today = new Date().toISOString().slice(0, 10);
    const usageRef = db.doc(`ocrUsage/${request.auth.uid}_${today}`);
    await db.runTransaction(async transaction => {
      const usage = await transaction.get(usageRef);
      const count = Number(usage.data()?.count || 0);
      if (count >= 50) throw new HttpsError('resource-exhausted', 'Daily receipt scan limit reached.');
      transaction.set(
        usageRef,
        {
          uid: request.auth!.uid,
          ownerId: caller.ownerId,
          date: today,
          count: count + 1,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });

    try {
      const detected = await extractReceiptText(image);
      if (!detected.text) throw new HttpsError('not-found', 'No readable text was found in this image.');
      const result = parseReceiptText(detected.text, detected.confidence, targetMachineNumber);
      await cacheRef.set({
        uid: request.auth.uid,
        ownerId: caller.ownerId,
        imageHash,
        result,
        createdAt: FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
      logger.info('Receipt OCR completed', {
        uid: request.auth.uid,
        ownerId: caller.ownerId,
        storeId,
        scanId,
        candidateCount: result.candidates.length,
        warningCount: result.warnings.length,
      });
      return { ...result, scanId, cached: false };
    } catch (error: unknown) {
      if (error instanceof HttpsError) throw error;
      logger.error('Receipt OCR failed', {
        uid: request.auth.uid,
        ownerId: caller.ownerId,
        storeId,
        scanId,
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
      throw new HttpsError('unavailable', 'Receipt reading is temporarily unavailable. Enter readings manually or try again.');
    }
  }
);

export const runVisit = onCall(async (request: CallableRequest) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'You must be logged in to run a visit.');
  }

  const { visitId, storeId, businessDate, readings, receiptPhotoUrl, receiptPhotoPath } = request.data as {
    visitId: string;
    storeId: string;
    businessDate: string;
    receiptPhotoUrl?: string;
    receiptPhotoPath?: string;
    readings: {
      machineId: string;
      presentIn: number;
      presentOut: number;
      photoUrl?: string;
      photoPath?: string;
      readingSource?: 'manual' | 'ocr_reviewed';
      ocrScanId?: string;
    }[];
  };
  if (!visitId || visitId.includes('/') || !storeId || !Array.isArray(readings)) {
    throw new HttpsError('invalid-argument', 'Visit, store, and machine readings are required.');
  }
  validateBusinessDate(businessDate);

  const caller = await resolveCaller(request.auth.uid);
  if (caller.role === 'employee' && !caller.assignedStoreIds.includes(storeId)) {
    throw new HttpsError('permission-denied', 'This store is not assigned to you.');
  }
  const expectedReceiptPath = `owners/${caller.ownerId}/stores/${storeId}/visits/${visitId}/receipt/`;
  if (
    (receiptPhotoPath && !receiptPhotoPath.startsWith(expectedReceiptPath)) ||
    Boolean(receiptPhotoPath) !== Boolean(receiptPhotoUrl)
  ) {
    throw new HttpsError('invalid-argument', 'Invalid receipt photo path.');
  }

  const storeRef = db.doc(`owners/${caller.ownerId}/stores/${storeId}`);
  const visitRef = db.doc(`owners/${caller.ownerId}/visits/${visitId}`);
  const machineQuery = db.collection(`owners/${caller.ownerId}/stores/${storeId}/machines`).where('active', '==', true);

  await db.runTransaction(async transaction => {
    const storeDoc = await transaction.get(storeRef);
    const existingVisit = await transaction.get(visitRef);
    const machineDocs = await transaction.get(machineQuery);
    if (!storeDoc.exists) throw new HttpsError('not-found', 'Store not found.');
    if (existingVisit.exists) throw new HttpsError('already-exists', 'This visit has already been recorded.');
    if (machineDocs.empty) throw new HttpsError('failed-precondition', 'This store has no active machines.');

    const readingByMachine = new Map(readings.map(reading => [reading.machineId, reading]));
    if (readingByMachine.size !== machineDocs.size) {
      throw new HttpsError('invalid-argument', 'Enter readings for every active machine.');
    }

    const visitMachines = machineDocs.docs.map(machineDoc => {
      const machine = machineDoc.data();
      const reading = readingByMachine.get(machineDoc.id);
      if (!reading || !Number.isFinite(reading.presentIn) || !Number.isFinite(reading.presentOut)) {
        throw new HttpsError('invalid-argument', `Valid readings are required for machine ${machine.machineNumber}.`);
      }
      const presentIn = round2(reading.presentIn);
      const presentOut = round2(reading.presentOut);
      if (presentIn < 0 || presentOut < 0) {
        throw new HttpsError('invalid-argument', `Machine ${machine.machineNumber}: readings cannot be negative.`);
      }
      if (presentIn < machine.lastSettledIn) {
        throw new HttpsError('invalid-argument', `Machine ${machine.machineNumber}: Present IN cannot be below Last Settled IN.`);
      }
      if (presentOut < machine.lastSettledOut) {
        throw new HttpsError('invalid-argument', `Machine ${machine.machineNumber}: Present OUT cannot be below Last Settled OUT.`);
      }
      const expectedPhotoPrefix = `owners/${caller.ownerId}/stores/${storeId}/visits/${visitId}/machines/${machineDoc.id}/`;
      if (reading.photoPath && !reading.photoPath.startsWith(expectedPhotoPrefix)) {
        throw new HttpsError('invalid-argument', 'Invalid machine photo path.');
      }
      if (reading.readingSource && !['manual', 'ocr_reviewed'].includes(reading.readingSource)) {
        throw new HttpsError('invalid-argument', 'Invalid reading source.');
      }
      if (reading.ocrScanId && !/^[a-f0-9]{20}$/.test(reading.ocrScanId)) {
        throw new HttpsError('invalid-argument', 'Invalid OCR scan reference.');
      }
      const newIn = round2(presentIn - machine.lastSettledIn);
      const newOut = round2(presentOut - machine.lastSettledOut);
      return {
        machineId: machineDoc.id,
        machineNumber: machine.machineNumber,
        name: machine.name || '',
        lastSettledIn: machine.lastSettledIn,
        lastSettledOut: machine.lastSettledOut,
        presentIn,
        presentOut,
        newIn,
        newOut,
        machineNet: round2(newIn - newOut),
        ...(reading.photoUrl ? { photoUrl: reading.photoUrl } : {}),
        ...(reading.photoPath ? { photoPath: reading.photoPath } : {}),
        readingSource: reading.readingSource === 'ocr_reviewed' ? 'ocr_reviewed' : 'manual',
        ...(reading.ocrScanId ? { ocrScanId: reading.ocrScanId } : {}),
      };
    });

    const totalNewIn = round2(visitMachines.reduce((sum, machine) => sum + machine.newIn, 0));
    const totalNewOut = round2(visitMachines.reduce((sum, machine) => sum + machine.newOut, 0));
    const totalNet = round2(totalNewIn - totalNewOut);
    const store = storeDoc.data()!;
    const storePercent = Number(store.defaultStorePercent);
    const vendorPercent = Number(store.defaultVendorPercent);
    if (storePercent + vendorPercent !== 100) {
      throw new HttpsError('failed-precondition', 'Store percentages must total 100 before RUN.');
    }
    const storeAmount = round2(totalNet * (storePercent / 100));
    const vendorAmount = round2(totalNet - storeAmount);

    transaction.set(visitRef, {
      storeId,
      storeName: store.name || '',
      employeeId: request.auth!.uid,
      employeeName: caller.name,
      businessDate,
      timestamp: FieldValue.serverTimestamp(),
      machines: visitMachines,
      totalNewIn,
      totalNewOut,
      totalNet,
      result: totalNet > 0 ? 'positive' : totalNet < 0 ? 'negative' : 'zero',
      storePercent,
      vendorPercent,
      storeAmount,
      vendorAmount,
      cashDueLocation: round2(totalNewOut + storeAmount),
      visitStatus: 'completed',
      settlementStatus: 'not_submitted',
      printStatus: 'not_printed',
      ...(receiptPhotoUrl ? { receiptPhotoUrl } : {}),
      ...(receiptPhotoPath ? { receiptPhotoPath } : {}),
    });
  });

  return { visitId, ownerId: caller.ownerId };
});

export const setVisitSplit = onCall(async (request: CallableRequest) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'You must be logged in to set a settlement split.');
  }
  const { ownerId, visitId, storePercent, vendorPercent } = request.data as {
    ownerId: string;
    visitId: string;
    storePercent: number;
    vendorPercent: number;
  };
  if (!ownerId || !visitId || storePercent < 0 || vendorPercent < 0 || storePercent + vendorPercent !== 100) {
    throw new HttpsError('invalid-argument', 'Store and Vendor percentages must total 100.');
  }

  const caller = await resolveCaller(request.auth.uid);
  if (caller.ownerId !== ownerId) throw new HttpsError('permission-denied', 'You cannot update this visit.');
  const visitRef = db.doc(`owners/${ownerId}/visits/${visitId}`);
  await db.runTransaction(async transaction => {
    const visitDoc = await transaction.get(visitRef);
    if (!visitDoc.exists) throw new HttpsError('not-found', 'Visit not found.');
    const visit = visitDoc.data()!;
    if (caller.role === 'employee' && !caller.assignedStoreIds.includes(visit.storeId)) {
      throw new HttpsError('permission-denied', 'This store is not assigned to you.');
    }
    if (visit.settlementStatus === 'submitted') {
      throw new HttpsError('failed-precondition', 'Submitted settlement percentages cannot be changed.');
    }
    const storeAmount = round2(visit.totalNet * (storePercent / 100));
    const vendorAmount = round2(visit.totalNet - storeAmount);
    transaction.update(visitRef, {
      storePercent,
      vendorPercent,
      storeAmount,
      vendorAmount,
      cashDueLocation: round2(visit.totalNewOut + storeAmount),
    });
  });
  return { success: true };
});

export const submitVisit = onCall(async (request: CallableRequest) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'You must be logged in to submit a visit.');
  }

  const { ownerId, visitId, storePercent, vendorPercent } = request.data as {
    ownerId: string;
    visitId: string;
    storePercent: number;
    vendorPercent: number;
  };
  if (!ownerId || !visitId || storePercent + vendorPercent !== 100) {
    throw new HttpsError('invalid-argument', 'A visit and percentages totaling 100 are required.');
  }

  const callerId = request.auth.uid;
  const caller = await resolveCaller(callerId);
  if (caller.ownerId !== ownerId) {
    throw new HttpsError('permission-denied', 'You cannot submit this visit.');
  }

  const visitRef = db.doc(`owners/${ownerId}/visits/${visitId}`);
  await db.runTransaction(async transaction => {
    const visitDoc = await transaction.get(visitRef);
    if (!visitDoc.exists) throw new HttpsError('not-found', 'Visit not found.');

    const visit = visitDoc.data()!;
    if (caller.role === 'employee' && !caller.assignedStoreIds.includes(visit.storeId)) {
      throw new HttpsError('permission-denied', 'This store is not assigned to you.');
    }
    if (visit.storePercent !== storePercent || visit.vendorPercent !== vendorPercent) {
      throw new HttpsError('failed-precondition', 'Save the percentage split before submitting.');
    }
    if (visit.settlementStatus === 'submitted') {
      throw new HttpsError('already-exists', 'This visit is already submitted.');
    }
    if (visit.totalNet <= 0) {
      throw new HttpsError('failed-precondition', 'Cannot submit a zero or negative run.');
    }

    const machineRefs = visit.machines.map((machine: any) =>
      db.doc(`owners/${ownerId}/stores/${visit.storeId}/machines/${machine.machineId}`)
    );
    const machineDocs = await transaction.getAll(...machineRefs);
    machineDocs.forEach((machineDoc, index) => {
      if (!machineDoc.exists) throw new HttpsError('not-found', 'A machine no longer exists.');
      const current = machineDoc.data() as { lastSettledIn: number; lastSettledOut: number };
      const snapshot = visit.machines[index];
      if (
        current.lastSettledIn !== snapshot.lastSettledIn ||
        current.lastSettledOut !== snapshot.lastSettledOut
      ) {
        throw new HttpsError('aborted', `Machine ${snapshot.machineNumber} changed. Please run again.`);
      }
    });

    const storeAmount = round2(visit.totalNet * (storePercent / 100));
    const vendorAmount = round2(visit.totalNet - storeAmount);

    machineRefs.forEach((machineRef: DocumentReference, index: number) => {
      const machine = visit.machines[index];
      transaction.update(machineRef, {
        lastSettledIn: machine.presentIn,
        lastSettledOut: machine.presentOut,
        lastSubmittedVisitId: visitId,
        lastSubmittedAt: FieldValue.serverTimestamp(),
      });
    });

    transaction.update(visitRef, {
      storePercent,
      vendorPercent,
      storeAmount,
      vendorAmount,
      cashDueLocation: round2(visit.totalNewOut + storeAmount),
      settlementStatus: 'submitted',
      settlement: {
        submittedAt: FieldValue.serverTimestamp(),
        submittedBy: callerId,
        storePercent,
        vendorPercent,
        storeAmount,
        vendorAmount,
      },
    });
  });

  return { success: true };
});
