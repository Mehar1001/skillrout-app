import { initializeApp } from 'firebase-admin/app'; // Corrected: Import initializeApp directly
import { getAuth } from 'firebase-admin/auth';
import { DocumentReference, FieldValue, getFirestore } from 'firebase-admin/firestore'; // Corrected: Import getFirestore directly
import { CallableRequest, HttpsError, onCall } from 'firebase-functions/v2/https';

// Initialize Firebase Admin SDK using the direct import
initializeApp(); // Called directly
const db = getFirestore(); // Corrected: Get Firestore instance directly
const auth = getAuth();

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
  if (callerId !== ownerId) {
    const employeeDoc = await db.doc(`employees/${callerId}`).get();
    const employee = employeeDoc.data();
    if (!employeeDoc.exists || employee?.ownerId !== ownerId || employee?.active !== true) {
      throw new HttpsError('permission-denied', 'You cannot submit this visit.');
    }
  }

  const visitRef = db.doc(`owners/${ownerId}/visits/${visitId}`);
  await db.runTransaction(async transaction => {
    const visitDoc = await transaction.get(visitRef);
    if (!visitDoc.exists) throw new HttpsError('not-found', 'Visit not found.');

    const visit = visitDoc.data()!;
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

    const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
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
