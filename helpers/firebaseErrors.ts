const fallback = 'Something went wrong. Please try again.';

export function mapFirebaseError(error: unknown): string {
  if (!error || typeof error !== 'object') return fallback;

  const code = (error as { code?: string }).code || '';
  const message = (error as { message?: string }).message || '';

  if (code === 'auth/invalid-email' || code === 'auth/invalid-credential') {
    return 'Email or password is incorrect.';
  }
  if (code === 'auth/user-disabled' || code === 'auth/user-not-found') {
    return 'This account is not active. Contact your owner.';
  }
  if (code === 'auth/wrong-password') {
    return 'Password is incorrect.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'An account already exists with this email.';
  }
  if (code === 'auth/weak-password') {
    return 'Password is too weak. Use at least 10 characters with letters, numbers, and symbols.';
  }
  if (code === 'auth/requires-recent-login') {
    return 'Please sign in again to continue.';
  }
  if (code === 'auth/network-request-failed' || code === 'unavailable' || message.includes('network')) {
    return 'Network connection failed. Check your internet and try again.';
  }
  if (code === 'permission-denied') {
    return 'You do not have permission to do that. Contact your owner if this is unexpected.';
  }
  if (code === 'unauthenticated') {
    return 'Please sign in again.';
  }
  if (code === 'not-found') {
    return 'The requested record was not found.';
  }
  if (code === 'already-exists') {
    return 'This record already exists.';
  }
  if (code === 'resource-exhausted' || message.includes('limit')) {
    return 'Daily limit reached. Try again later or contact support.';
  }
  if (code === 'failed-precondition') {
    return message || 'A required condition is not met.';
  }
  if (code === 'invalid-argument') {
    return message || 'Some entered information is not valid.';
  }

  return message || fallback;
}
