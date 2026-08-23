import { initializeTestEnvironment, assertSucceeds, assertFails, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { describe, it, before, after, beforeEach } from 'node:test';
import fs from 'node:fs';

const projectId = 'demo-skillrout';

const ownerA = {
  email: 'owner@example.com',
  businessName: 'Skillrout Demo',
  subscriptionStatus: 'active',
  status: 'active',
  schemaVersion: 1,
};

const store1 = {
  name: 'Store One',
  address: '123 Main St',
  active: true,
  defaultStorePercent: 60,
  defaultVendorPercent: 40,
  schemaVersion: 1,
};

const machine1 = {
  machineNumber: 'M001',
  name: 'Machine One',
  storeId: 'store1',
  active: true,
  lastSettledIn: 0,
  lastSettledOut: 0,
  baselineVersion: 1,
  schemaVersion: 1,
};

const employeeA = {
  email: 'employee@example.com',
  name: 'Demo Employee',
  role: 'employee',
  ownerId: 'ownerA',
  businessName: 'Skillrout Demo',
  assignedStoreIds: ['store1'],
  active: true,
  mustChangePassword: false,
  schemaVersion: 1,
};

const employeeInactive = { ...employeeA, active: false, assignedStoreIds: ['store1'] };

const seed = async (testEnv: RulesTestEnvironment) => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const batch = db.batch();
    batch.set(db.doc('owners/ownerA'), ownerA);
    batch.set(db.doc('owners/ownerB'), { ...ownerA, businessName: 'Other' });
    batch.set(db.doc('owners/ownerA/stores/store1'), store1);
    batch.set(db.doc('owners/ownerA/stores/store1/machines/machine1'), machine1);
    batch.set(db.doc('employees/employeeA'), employeeA);
    batch.set(db.doc('employees/employeeInactive'), employeeInactive);
    batch.set(db.doc('employees/employeeOtherOwner'), { ...employeeA, ownerId: 'ownerB' });
    batch.set(db.doc('employees/employeeUnassigned'), { ...employeeA, assignedStoreIds: ['store2'] });
    // A visit that can be updated for print metadata.
    batch.set(db.doc('owners/ownerA/stores/store1/visits/visit1'), {
      ownerId: 'ownerA',
      storeId: 'store1',
      businessDate: '2026-08-21',
      printStatus: 'pending',
      schemaVersion: 1,
    });
    await batch.commit();
  });
};

const seedStorage = async (testEnv: RulesTestEnvironment) => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const batch = db.batch();
    batch.set(db.doc('owners/ownerA'), ownerA);
    batch.set(db.doc('owners/ownerA/stores/store1'), store1);
    batch.set(db.doc('employees/employeeA'), employeeA);
    batch.set(db.doc('employees/employeeInactive'), employeeInactive);
    batch.set(db.doc('employees/employeeUnassigned'), { ...employeeA, assignedStoreIds: ['store2'] });
    await batch.commit();
  });
};

describe('Firestore security rules', () => {
  let testEnv: RulesTestEnvironment;

  before(async () => {
    testEnv = await initializeTestEnvironment({
      projectId,
      firestore: { rules: fs.readFileSync('firestore.rules', 'utf8') },
    });
  });

  after(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
    await seed(testEnv);
  });

  describe('owner access', () => {
    it('allows an owner to read and write their own owner doc', async () => {
      const owner = testEnv.authenticatedContext('ownerA', { email_verified: true });
      const db = owner.firestore();
      await assertSucceeds(db.doc('owners/ownerA').get());
      await assertSucceeds(db.doc('owners/ownerA').update({ businessName: 'Updated' }));
    });

    it('denies an owner from reading another owner doc', async () => {
      const owner = testEnv.authenticatedContext('ownerA', { email_verified: true });
      const db = owner.firestore();
      await assertFails(db.doc('owners/ownerB').get());
    });

    it('denies unverified owner actions', async () => {
      const owner = testEnv.authenticatedContext('ownerA', { email_verified: false });
      const db = owner.firestore();
      await assertFails(db.doc('owners/ownerA').update({ businessName: 'Updated' }));
    });
  });

  describe('store access', () => {
    it('allows owner to create, read, update, and delete store', async () => {
      const owner = testEnv.authenticatedContext('ownerA', { email_verified: true });
      const db = owner.firestore();
      await assertSucceeds(db.doc('owners/ownerA/stores/store1').get());
      await assertSucceeds(db.doc('owners/ownerA/stores/store2').set({
        name: 'Store Two', active: true, defaultStorePercent: 50, defaultVendorPercent: 50, schemaVersion: 1,
      }));
      await assertSucceeds(db.doc('owners/ownerA/stores/store2').update({ name: 'Updated' }));
      await assertFails(db.doc('owners/ownerA/stores/store2').delete());
    });

    it('allows assigned active employee to read store', async () => {
      const emp = testEnv.authenticatedContext('employeeA', { email_verified: true });
      await assertSucceeds(emp.firestore().doc('owners/ownerA/stores/store1').get());
    });

    it('denies employee from creating or updating store', async () => {
      const emp = testEnv.authenticatedContext('employeeA', { email_verified: true });
      const db = emp.firestore();
      await assertFails(db.doc('owners/ownerA/stores/store2').set({
        name: 'Store Two', active: true, defaultStorePercent: 50, defaultVendorPercent: 50, schemaVersion: 1,
      }));
      await assertFails(db.doc('owners/ownerA/stores/store1').update({ name: 'Hacked' }));
    });

    it('denies inactive employee store access', async () => {
      const emp = testEnv.authenticatedContext('employeeInactive', { email_verified: true });
      await assertFails(emp.firestore().doc('owners/ownerA/stores/store1').get());
    });

    it('denies employee from wrong tenant', async () => {
      const emp = testEnv.authenticatedContext('employeeOtherOwner', { email_verified: true });
      await assertFails(emp.firestore().doc('owners/ownerA/stores/store1').get());
    });

    it('denies employee from unassigned store', async () => {
      const emp = testEnv.authenticatedContext('employeeUnassigned', { email_verified: true });
      await assertFails(emp.firestore().doc('owners/ownerA/stores/store1').get());
    });

    it('rejects invalid store data', async () => {
      const owner = testEnv.authenticatedContext('ownerA', { email_verified: true });
      const db = owner.firestore();
      await assertFails(db.doc('owners/ownerA/stores/bad').set({
        name: 'Bad', defaultStorePercent: 80, defaultVendorPercent: 10, schemaVersion: 1,
      }));
    });
  });

  describe('machine access', () => {
    it('allows owner to create and read machine', async () => {
      const owner = testEnv.authenticatedContext('ownerA', { email_verified: true });
      const db = owner.firestore();
      await assertSucceeds(db.doc('owners/ownerA/stores/store1/machines/machine1').get());
      await assertSucceeds(db.doc('owners/ownerA/stores/store1/machines/machine2').set({
        machineNumber: 'M002', name: 'Machine Two', storeId: 'store1', active: true,
        lastSettledIn: 0, lastSettledOut: 0, baselineVersion: 1, schemaVersion: 1,
      }));
    });

    it('allows assigned active employee to read machine', async () => {
      const emp = testEnv.authenticatedContext('employeeA', { email_verified: true });
      await assertSucceeds(emp.firestore().doc('owners/ownerA/stores/store1/machines/machine1').get());
    });

    it('denies employee from writing machine', async () => {
      const emp = testEnv.authenticatedContext('employeeA', { email_verified: true });
      const db = emp.firestore();
      await assertFails(db.doc('owners/ownerA/stores/store1/machines/machine1').update({ name: 'Hacked' }));
    });

    it('rejects machine update that touches settled baselines', async () => {
      const owner = testEnv.authenticatedContext('ownerA', { email_verified: true });
      const db = owner.firestore();
      await assertFails(db.doc('owners/ownerA/stores/store1/machines/machine1').update({ lastSettledIn: 999 }));
    });
  });

  describe('visit access', () => {
    it('denies creating or deleting visits from client', async () => {
      const owner = testEnv.authenticatedContext('ownerA', { email_verified: true });
      const db = owner.firestore();
      await assertFails(db.doc('owners/ownerA/stores/store1/visits/visit2').set({ ownerId: 'ownerA', storeId: 'store1', businessDate: '2026-08-21' }));
      await assertFails(db.doc('owners/ownerA/stores/store1/visits/visit1').delete());
    });

    it('allows employee to update print fields only', async () => {
      const emp = testEnv.authenticatedContext('employeeA', { email_verified: true });
      const db = emp.firestore();
      await assertSucceeds(db.doc('owners/ownerA/stores/store1/visits/visit1').update({
        printStatus: 'printed', printedAt: new Date().toISOString(), printedBy: 'employeeA',
      }));
    });

    it('denies updating non-print visit fields', async () => {
      const emp = testEnv.authenticatedContext('employeeA', { email_verified: true });
      const db = emp.firestore();
      await assertFails(db.doc('owners/ownerA/stores/store1/visits/visit1').update({ totalNet: 100 }));
    });

    it('denies print update from unassigned employee', async () => {
      const emp = testEnv.authenticatedContext('employeeUnassigned', { email_verified: true });
      const db = emp.firestore();
      await assertFails(db.doc('owners/ownerA/stores/store1/visits/visit1').update({
        printStatus: 'printed', printedAt: new Date().toISOString(), printedBy: 'employeeUnassigned',
      }));
    });

    it('denies visit access from wrong tenant', async () => {
      const emp = testEnv.authenticatedContext('employeeOtherOwner', { email_verified: true });
      await assertFails(emp.firestore().doc('owners/ownerA/stores/store1/visits/visit1').get());
    });
  });

  describe('employee profile access', () => {
    it('allows employee to read their own profile', async () => {
      const emp = testEnv.authenticatedContext('employeeA', { email_verified: true });
      await assertSucceeds(emp.firestore().doc('employees/employeeA').get());
    });

    it('allows owner to read employee profile', async () => {
      const owner = testEnv.authenticatedContext('ownerA', { email_verified: true });
      await assertSucceeds(owner.firestore().doc('employees/employeeA').get());
    });

    it('denies employee from updating profile', async () => {
      const emp = testEnv.authenticatedContext('employeeA', { email_verified: true });
      await assertFails(emp.firestore().doc('employees/employeeA').update({ name: 'Hacked' }));
    });

    it('denies one employee from reading another employee profile', async () => {
      const emp = testEnv.authenticatedContext('employeeA', { email_verified: true });
      await assertFails(emp.firestore().doc('employees/employeeInactive').get());
    });
  });
});

describe('Storage security rules', () => {
  let testEnv: RulesTestEnvironment;

  before(async () => {
    testEnv = await initializeTestEnvironment({
      projectId,
      storage: { rules: fs.readFileSync('storage.rules', 'utf8') },
    });
  });

  after(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
    await testEnv.clearStorage();
    await seedStorage(testEnv);
  });

  const validPath = 'owners/ownerA/stores/store1/visits/visitNew/machines/machine1/photo.jpg';

  it('allows owner to upload a visit machine photo', async () => {
    const owner = testEnv.authenticatedContext('ownerA');
    const storage = owner.storage();
    const ref = storage.ref(validPath);
    await assertSucceeds(ref.put(new Uint8Array(100), { contentType: 'image/jpeg' }) as unknown as Promise<unknown>);
  });

  it('allows assigned active employee to upload a photo', async () => {
    const emp = testEnv.authenticatedContext('employeeA');
    const storage = emp.storage();
    await assertSucceeds(storage.ref(validPath).put(new Uint8Array(100), { contentType: 'image/jpeg' }) as unknown as Promise<unknown>);
  });

  it('allows reading an uploaded photo by owner and employee', async () => {
    const owner = testEnv.authenticatedContext('ownerA');
    await assertSucceeds(owner.storage().ref(validPath).put(new Uint8Array(100), { contentType: 'image/jpeg' }) as unknown as Promise<unknown>);
    await assertSucceeds(owner.storage().ref(validPath).getMetadata());
    const emp = testEnv.authenticatedContext('employeeA');
    await assertSucceeds(emp.storage().ref(validPath).getMetadata());
  });

  it('denies upload from inactive employee', async () => {
    const emp = testEnv.authenticatedContext('employeeInactive');
    await assertFails(emp.storage().ref(validPath).put(new Uint8Array(100), { contentType: 'image/jpeg' }) as unknown as Promise<unknown>);
  });

  it('denies upload from unassigned employee', async () => {
    const emp = testEnv.authenticatedContext('employeeUnassigned');
    await assertFails(emp.storage().ref(validPath).put(new Uint8Array(100), { contentType: 'image/jpeg' }) as unknown as Promise<unknown>);
  });

  it('denies upload from wrong tenant', async () => {
    const emp = testEnv.authenticatedContext('employeeOtherOwner');
    await assertFails(emp.storage().ref(validPath).put(new Uint8Array(100), { contentType: 'image/jpeg' }) as unknown as Promise<unknown>);
  });

  it('denies non-image content type', async () => {
    const owner = testEnv.authenticatedContext('ownerA');
    await assertFails(owner.storage().ref(validPath).put(new Uint8Array(100), { contentType: 'application/pdf' }) as unknown as Promise<unknown>);
  });

  it('denies oversized image', async () => {
    const owner = testEnv.authenticatedContext('ownerA');
    const oversized = new Uint8Array(6 * 1024 * 1024);
    await assertFails(owner.storage().ref(validPath).put(oversized, { contentType: 'image/jpeg' }) as unknown as Promise<unknown>);
  });

  it('denies upload when visit already exists', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc('owners/ownerA/visits/visitNew').set({ storeId: 'store1' });
    });
    const owner = testEnv.authenticatedContext('ownerA');
    await assertFails(owner.storage().ref(validPath).put(new Uint8Array(100), { contentType: 'image/jpeg' }) as unknown as Promise<unknown>);
  });

  it('denies delete operations', async () => {
    const owner = testEnv.authenticatedContext('ownerA');
    await assertSucceeds(owner.storage().ref(validPath).put(new Uint8Array(100), { contentType: 'image/jpeg' }) as unknown as Promise<unknown>);
    await assertFails(owner.storage().ref(validPath).delete());
  });

  it('denies unauthorized path patterns', async () => {
    const owner = testEnv.authenticatedContext('ownerA');
    await assertFails(owner.storage().ref('random/path.jpg').put(new Uint8Array(100), { contentType: 'image/jpeg' }) as unknown as Promise<unknown>);
  });
});
