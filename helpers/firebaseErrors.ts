const fallback = 'Something went wrong. Please try again.';

export function mapFirebaseError(error: unknown): string {
  if (!error || typeof error !== 'object') return fallback;

  const code = (error as { code?: string }).code || '';
  const message = (error as { message?: string }).message || '';

  if (code === 'auth/invalid-email') {
    return 'Enter a valid email address.';
  }
  if (code === 'auth/invalid-credential') {
    return 'The email or password does not match our records.';
  }
  if (code === 'auth/user-not-found') {
    return 'This email address does not match an account.';
  }
  if (code === 'auth/user-disabled') {
    return 'This account has been disabled. Contact your owner or administrator.';
  }
  if (code === 'auth/wrong-password') {
    return 'The password does not match this account.';
  }
  if (code === 'auth/quota-exceeded') {
    return 'Sign-in is temporarily unavailable because too many requests were made. Please wait a few minutes and try again.';
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
