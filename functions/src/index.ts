import { initializeApp } from 'firebase-admin/app'; // Corrected: Import initializeApp directly
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore'; // Corrected: Import getFirestore directly
import { defineSecret } from 'firebase-functions/params';
import { CallableRequest, HttpsError, onCall } from 'firebase-functions/v2/https';
import twilio from 'twilio';

// Initialize Firebase Admin SDK using the direct import
initializeApp(); // Called directly
const db = getFirestore(); // Corrected: Get Firestore instance directly
const auth = getAuth();

let cachedTwilioClient: ReturnType<typeof twilio> | null = null;

// Define secrets as before
export const twilioSid = defineSecret("TWILIO_SID");
export const twilioToken = defineSecret("TWILIO_TOKEN");
export const twilioNumber = defineSecret("TWILIO_NUMBER");

export const sendBulkSms = onCall({ secrets: [twilioSid, twilioToken, twilioNumber] }, async (request: CallableRequest) => {
  const data = request.data as { message: string };
  const context = request.auth;

  const sid = twilioSid.value();
  const token = twilioToken.value();
  const sender = twilioNumber.value();

  if (!cachedTwilioClient) {
    try {
      cachedTwilioClient = twilio(sid, token);
      console.log("Twilio client initialized successfully.");
    } catch (err) {
      console.error("Error initializing Twilio client:", err);
      throw new HttpsError(
        'internal',
        'Server error: Failed to initialize Twilio service.'
      );
    }
  }

  if (!cachedTwilioClient || !sender) {
    console.error("Twilio client or sender number is not configured after initialization attempt.");
    throw new HttpsError(
      'internal',
      'Twilio service is not fully configured on the server.'
    );
  }

  if (!context || !context.uid) {
    console.error('Authentication failed: context.auth is null or missing UID.');
    throw new HttpsError(
      'unauthenticated',
      'You must be logged in to send messages.'
    );
  }

  const ownerId = context.uid;
  const messageBody = data.message;

  if (!messageBody || messageBody.trim().length === 0) {
    throw new HttpsError(
      'invalid-argument',
      'The message body cannot be empty.'
    );
  }

  try {
    // Corrected Firestore access to use the db instance from getFirestore()
    const ownerDoc = await db.collection("owners").doc(ownerId).get();
    if (!ownerDoc.exists || ownerDoc.data()?.hasSmsFeature !== true) {
      throw new HttpsError(
        'permission-denied',
        'Your subscription does not include this feature.'
      );
    }

    // Corrected Firestore access for customers collection
    const customersRef = db.collection(`owners/${ownerId}/customers`);
    const snapshot = await customersRef.get();
    if (snapshot.empty) {
      return { success: false, message: "No customers found for this owner." };
    }

    const phoneNumbers = snapshot.docs.map(doc => `+1${doc.id}`);
    const smsPromises = phoneNumbers.map((number) => {
      return cachedTwilioClient!.messages.create({
        to: number,
        from: sender,
        body: messageBody,
      });
    });

    const results = await Promise.allSettled(smsPromises);
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const errorCount = results.length - successCount;

    console.log(`SMS sending complete: ${successCount} successful, ${errorCount} failed.`);

    return {
      success: true,
      message: "Messaging process complete!",
      successCount,
      errorCount,
    };
  } catch (error: any) {
    console.error("Critical error in sendBulkSms function:", error);
    if (error.code && error.message) {
      throw new HttpsError(error.code, error.message);
    } else {
      throw new HttpsError(
        'internal',
        'An unexpected server error occurred during SMS processing.',
        error.message
      );
    }
  }
});

export const createEmployee = onCall(async (request: CallableRequest) => {
  const context = request.auth;
  const { email, name, password } = request.data as { email: string; name: string; password: string };

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

  try {
    const userRecord = await auth.createUser({
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
      active: true,
      createdAt: FieldValue.serverTimestamp(),
    });

    return { uid: userRecord.uid, email: email.trim(), name: name.trim() };
  } catch (error: any) {
    console.error('Error creating employee:', error);
    if (error.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'That email is already in use.');
    }
    throw new HttpsError('internal', 'Failed to create employee. Please try again.');
  }
});
