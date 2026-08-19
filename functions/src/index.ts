import { initializeApp } from 'firebase-admin/app'; // Corrected: Import initializeApp directly
import { getAuth } from 'firebase-admin/auth';
import { DocumentReference, FieldValue, getFirestore } from 'firebase-admin/firestore'; // Corrected: Import getFirestore directly
import { CallableRequest, HttpsError, onCall } from 'firebase-functions/v2/https';

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

export const runVisit = onCall(async (request: CallableRequest) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'You must be logged in to run a visit.');
  }

  const { visitId, storeId, businessDate, readings } = request.data as {
    visitId: string;
    storeId: string;
    businessDate: string;
    readings: {
      machineId: string;
      presentIn: number;
      presentOut: number;
      photoUrl?: string;
      photoPath?: string;
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
