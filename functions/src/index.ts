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

import { calculateMachine, calculateVisit, round2 } from './calculations.js';

const passwordComplexity = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{10,128}$/;

const requireActiveOwner = async (uid: string, emailVerified: boolean) => {
  if (!emailVerified) throw new HttpsError('failed-precondition', 'Verify your email before managing employees.');
  const ownerDoc = await db.doc(`owners/${uid}`).get();
  const owner = ownerDoc.data();
  if (!ownerDoc.exists || owner?.subscriptionStatus !== 'active' || owner?.status === 'inactive') {
    throw new HttpsError('permission-denied', 'Only an active owner can perform this action.');
  }
  return owner;
};

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

export const registerOwnerProfile = onCall(async (request: CallableRequest) => {
  if (!request.auth?.uid || !request.auth.token.email) {
    throw new HttpsError('unauthenticated', 'Sign in to create an owner profile.');
  }
  const businessName = typeof request.data?.businessName === 'string' ? request.data.businessName.trim() : '';
  if (!businessName || businessName.length > 120) {
    throw new HttpsError('invalid-argument', 'Business name is required and must be 120 characters or fewer.');
  }
  const ownerRef = db.doc(`owners/${request.auth.uid}`);
  await db.runTransaction(async transaction => {
    const existing = await transaction.get(ownerRef);
    if (existing.exists) return;
    transaction.create(ownerRef, {
      email: String(request.auth!.token.email).trim().toLowerCase(),
      businessName,
      subscriptionStatus: 'active',
      status: 'pending_verification',
      schemaVersion: 1,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  return { success: true };
});

export const provisionOwner = onCall(async (request: CallableRequest) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to provision your account.');
  if (request.auth.token.email_verified !== true) {
    throw new HttpsError('failed-precondition', 'Verify your email before activating your account.');
  }
  const ownerRef = db.doc(`owners/${request.auth.uid}`);
  const owner = await ownerRef.get();
  if (!owner.exists) throw new HttpsError('failed-precondition', 'Owner profile setup is incomplete. Register again.');
  const subscriptionStatus = owner.data()?.subscriptionStatus;
  await ownerRef.update({
    status: subscriptionStatus === 'active' ? 'active' : 'inactive',
    schemaVersion: 1,
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { success: true };
});

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
  const owner = await requireActiveOwner(ownerId, context.token.email_verified === true);
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const normalizedName = typeof name === 'string' ? name.trim() : '';
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail) || !normalizedName || normalizedName.length > 120 || !passwordComplexity.test(password || '')) {
    throw new HttpsError('invalid-argument', 'Valid email, name, and a 10–128 character strong password are required.');
  }
  if (!Array.isArray(assignedStoreIds) || assignedStoreIds.length === 0 || assignedStoreIds.length > 100) {
    throw new HttpsError('invalid-argument', 'Assign between 1 and 100 stores.');
  }
  const uniqueStoreIds = [...new Set(assignedStoreIds.filter(storeId => typeof storeId === 'string' && storeId.length <= 128))];
  if (uniqueStoreIds.length !== assignedStoreIds.length) {
    throw new HttpsError('invalid-argument', 'Assigned stores must be unique valid IDs.');
  }

  const storeDocs = await Promise.all(
    uniqueStoreIds.map(storeId => db.doc(`owners/${ownerId}/stores/${storeId}`).get())
  );
  if (storeDocs.some(storeDoc => !storeDoc.exists || storeDoc.data()?.active !== true)) {
    throw new HttpsError('invalid-argument', 'One or more assigned stores are missing or inactive.');
  }

  let userRecord;
  try {
    userRecord = await auth.createUser({
      email: normalizedEmail,
      password,
      displayName: normalizedName,
      emailVerified: true,
    });

    await db.collection('employees').doc(userRecord.uid).set({
      email: normalizedEmail,
      name: normalizedName,
      role: 'employee',
      ownerId,
      businessName: owner.businessName || '',
      assignedStoreIds: uniqueStoreIds,
      active: true,
      mustChangePassword: true,
      schemaVersion: 1,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { uid: userRecord.uid, email: normalizedEmail, name: normalizedName };
  } catch (error: any) {
    if (userRecord) await auth.deleteUser(userRecord.uid);
    logger.error('Employee creation failed', { ownerId, errorCode: error?.code || 'unknown' });
    if (error.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'That email is already in use.');
    }
    throw new HttpsError('internal', 'Failed to create employee. Please try again.');
  }
});

export const updateEmployeeAssignments = onCall(async (request: CallableRequest) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to update an employee.');
  await requireActiveOwner(request.auth.uid, request.auth.token.email_verified === true);
  const employeeId = typeof request.data?.employeeId === 'string' ? request.data.employeeId : '';
  const name = typeof request.data?.name === 'string' ? request.data.name.trim() : '';
  const assignedStoreIds = Array.isArray(request.data?.assignedStoreIds) ? request.data.assignedStoreIds : [];
  const uniqueStoreIds = [...new Set(assignedStoreIds.filter((storeId: unknown): storeId is string => typeof storeId === 'string' && storeId.length <= 128))];
  if (!employeeId || !name || name.length > 120 || uniqueStoreIds.length < 1 || uniqueStoreIds.length > 100 || uniqueStoreIds.length !== assignedStoreIds.length) {
    throw new HttpsError('invalid-argument', 'Employee name and 1–100 unique assigned stores are required.');
  }
  const employeeRef = db.doc(`employees/${employeeId}`);
  const [employee, ...stores] = await Promise.all([
    employeeRef.get(),
    ...uniqueStoreIds.map(storeId => db.doc(`owners/${request.auth!.uid}/stores/${storeId}`).get()),
  ]);
  if (!employee.exists || employee.data()?.ownerId !== request.auth.uid) {
    throw new HttpsError('not-found', 'Employee not found.');
  }
  if (stores.some(store => !store.exists || store.data()?.active !== true)) {
    throw new HttpsError('invalid-argument', 'One or more assigned stores are missing or inactive.');
  }
  await employeeRef.update({ name, assignedStoreIds: uniqueStoreIds, updatedAt: FieldValue.serverTimestamp() });
  await auth.updateUser(employeeId, { displayName: name });
  return { success: true };
});

export const setEmployeeActive = onCall(async (request: CallableRequest) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to update an employee.');
  await requireActiveOwner(request.auth.uid, request.auth.token.email_verified === true);
  const employeeId = typeof request.data?.employeeId === 'string' ? request.data.employeeId : '';
  const active = request.data?.active;
  if (!employeeId || typeof active !== 'boolean') throw new HttpsError('invalid-argument', 'Employee and active status are required.');
  const employeeRef = db.doc(`employees/${employeeId}`);
  const employee = await employeeRef.get();
  if (!employee.exists || employee.data()?.ownerId !== request.auth.uid) {
    throw new HttpsError('not-found', 'Employee not found.');
  }
  await auth.updateUser(employeeId, { disabled: !active });
  await auth.revokeRefreshTokens(employeeId);
  await employeeRef.update({
    active,
    updatedAt: FieldValue.serverTimestamp(),
    ...(active
      ? { reactivatedAt: FieldValue.serverTimestamp() }
      : { deactivatedAt: FieldValue.serverTimestamp() }),
  });
  return { success: true };
});

export const resetEmployeeTemporaryPassword = onCall(async (request: CallableRequest) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to reset an employee password.');
  await requireActiveOwner(request.auth.uid, request.auth.token.email_verified === true);
  const employeeId = typeof request.data?.employeeId === 'string' ? request.data.employeeId : '';
  const password = typeof request.data?.password === 'string' ? request.data.password : '';
  if (!employeeId || !passwordComplexity.test(password)) {
    throw new HttpsError('invalid-argument', 'A 10–128 character strong temporary password is required.');
  }
  const employeeRef = db.doc(`employees/${employeeId}`);
  const employee = await employeeRef.get();
  if (!employee.exists || employee.data()?.ownerId !== request.auth.uid) {
    throw new HttpsError('not-found', 'Employee not found.');
  }
  await auth.updateUser(employeeId, { password });
  await auth.revokeRefreshTokens(employeeId);
  await employeeRef.update({ mustChangePassword: true, updatedAt: FieldValue.serverTimestamp() });
  return { success: true };
});

export const completeEmployeePasswordChange = onCall(async (request: CallableRequest) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to complete password setup.');
  const employeeRef = db.doc(`employees/${request.auth.uid}`);
  const employee = await employeeRef.get();
  if (!employee.exists || employee.data()?.active !== true) throw new HttpsError('permission-denied', 'Employee account is inactive.');
  await employeeRef.update({ mustChangePassword: false, updatedAt: FieldValue.serverTimestamp() });
  return { success: true };
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
  const visitRef = db.doc(`owners/${caller.ownerId}/stores/${storeId}/visits/${visitId}`);
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
      const { newIn, newOut, machineNet } = calculateMachine(machine as any, presentIn, presentOut);
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
        machineNet,
        ...(reading.photoUrl ? { photoUrl: reading.photoUrl } : {}),
        ...(reading.photoPath ? { photoPath: reading.photoPath } : {}),
        readingSource: reading.readingSource === 'ocr_reviewed' ? 'ocr_reviewed' : 'manual',
        ...(reading.ocrScanId ? { ocrScanId: reading.ocrScanId } : {}),
      };
    });

    const store = storeDoc.data()!;
    const storePercent = Number(store.defaultStorePercent);
    const vendorPercent = Number(store.defaultVendorPercent);
    if (storePercent + vendorPercent !== 100) {
      throw new HttpsError('failed-precondition', 'Store percentages must total 100 before RUN.');
    }
    const { totalNewIn, totalNewOut, totalNet, result, storeAmount, vendorAmount, cashDueLocation } =
      calculateVisit(visitMachines, storePercent);

    transaction.set(visitRef, {
      ownerId: caller.ownerId,
      storeId,
      storeName: store.name || '',
      storeAddress: store.address || '',
      employeeId: request.auth!.uid,
      employeeName: caller.name,
      businessDate,
      timestamp: FieldValue.serverTimestamp(),
      machines: visitMachines,
      totalNewIn,
      totalNewOut,
      totalNet,
      result,
      storePercent,
      vendorPercent,
      storeAmount,
      vendorAmount,
      cashDueLocation,
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
  const { ownerId, storeId, visitId, storePercent, vendorPercent } = request.data as {
    ownerId: string;
    storeId: string;
    visitId: string;
    storePercent: number;
    vendorPercent: number;
  };
  if (!ownerId || !storeId || !visitId || storePercent < 0 || vendorPercent < 0 || storePercent + vendorPercent !== 100) {
    throw new HttpsError('invalid-argument', 'Store, visit, and percentages totaling 100 are required.');
  }

  const caller = await resolveCaller(request.auth.uid);
  if (caller.ownerId !== ownerId) throw new HttpsError('permission-denied', 'You cannot update this visit.');
  const visitRef = db.doc(`owners/${ownerId}/stores/${storeId}/visits/${visitId}`);
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
    const { storeAmount, vendorAmount, cashDueLocation } = calculateVisit(visit.machines, storePercent);
    transaction.update(visitRef, {
      storePercent,
      vendorPercent,
      storeAmount,
      vendorAmount,
      cashDueLocation,
    });
  });
  return { success: true };
});

export const submitVisit = onCall(async (request: CallableRequest) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'You must be logged in to submit a visit.');
  }

  const { ownerId, storeId, visitId, storePercent, vendorPercent } = request.data as {
    ownerId: string;
    storeId: string;
    visitId: string;
    storePercent: number;
    vendorPercent: number;
  };
  if (!ownerId || !storeId || !visitId || storePercent + vendorPercent !== 100) {
    throw new HttpsError('invalid-argument', 'A visit, store, and percentages totaling 100 are required.');
  }

  const callerId = request.auth.uid;
  const caller = await resolveCaller(callerId);
  if (caller.ownerId !== ownerId) {
    throw new HttpsError('permission-denied', 'You cannot submit this visit.');
  }

  const visitRef = db.doc(`owners/${ownerId}/stores/${storeId}/visits/${visitId}`);
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

    const { storeAmount, vendorAmount, cashDueLocation } = calculateVisit(visit.machines, storePercent);

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
      cashDueLocation,
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

export const employeeOnboardStore = onCall(async (request: CallableRequest) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Sign in to onboard a store.');
  }

  const caller = await resolveCaller(request.auth.uid);
  if (caller.role !== 'employee') {
    throw new HttpsError('permission-denied', 'Only employees can onboard a store through this flow.');
  }

  const { name, address, defaultStorePercent, defaultVendorPercent, machines } = request.data as {
    name: string;
    address: string;
    defaultStorePercent: number;
    defaultVendorPercent: number;
    machines: Array<{ machineNumber: string; name: string }>;
  };

  if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 200) {
    throw new HttpsError('invalid-argument', 'Store name is required (1-200 characters).');
  }
  if (
    typeof defaultStorePercent !== 'number' ||
    typeof defaultVendorPercent !== 'number' ||
    defaultStorePercent < 0 ||
    defaultVendorPercent < 0 ||
    defaultStorePercent + defaultVendorPercent !== 100
  ) {
    throw new HttpsError('invalid-argument', 'Store and Games percentages must total 100.');
  }
  if (!Array.isArray(machines) || machines.length === 0) {
    throw new HttpsError('invalid-argument', 'At least one machine is required.');
  }

  const ownerId = caller.ownerId;
  const storeRef = db.collection(`owners/${ownerId}/stores`).doc();
  const storeId = storeRef.id;
  const employeeRef = db.doc(`employees/${request.auth.uid}`);

  const machineEntries = machines.map(machine => {
    if (typeof machine?.machineNumber !== 'string' || !machine.machineNumber.trim() ||
        typeof machine?.name !== 'string' || !machine.name.trim()) {
      throw new HttpsError('invalid-argument', 'Each machine needs a number and a name.');
    }
    const machineRef = db.collection(`owners/${ownerId}/stores/${storeId}/machines`).doc();
    return {
      id: machineRef.id,
      ref: machineRef,
      data: {
        machineNumber: machine.machineNumber.trim(),
        name: machine.name.trim(),
        storeId,
        active: true,
        lastSettledIn: 0,
        lastSettledOut: 0,
        baselineVersion: 0,
        schemaVersion: 1,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
    };
  });

  await db.runTransaction(async transaction => {
    const employeeDoc = await transaction.get(employeeRef);
    if (!employeeDoc.exists) {
      throw new HttpsError('not-found', 'Employee record not found.');
    }
    const employee = employeeDoc.data()!;
    const assignedStoreIds = employee.assignedStoreIds || [];

    transaction.set(storeRef, {
      name: name.trim(),
      address: (address || '').trim(),
      active: true,
      defaultStorePercent,
      defaultVendorPercent,
      schemaVersion: 1,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    machineEntries.forEach(entry => transaction.set(entry.ref, entry.data));

    transaction.update(employeeRef, {
      assignedStoreIds: [...assignedStoreIds, storeId],
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return { storeId, ownerId, machineCount: machineEntries.length };
});
