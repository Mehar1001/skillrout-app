import { type Auth, sendPasswordResetEmail } from 'firebase/auth';

export type PasswordResetRole = 'owner' | 'employee';

export const SKILLROUT_WEB_URL = 'https://skillrout.web.app';

export const normalizeResetEmail = (email: string): string => email.trim().toLowerCase();

export const isValidResetEmail = (email: string): boolean => /^\S+@\S+\.\S+$/.test(normalizeResetEmail(email));

export const getPasswordResetSettings = (role: PasswordResetRole) => ({
  url: `${SKILLROUT_WEB_URL}/${role}/login?reset=success`,
  handleCodeInApp: false,
});

export const sendSkillroutPasswordReset = async (
  auth: Auth,
  email: string,
  role: PasswordResetRole
): Promise<void> => {
  await sendPasswordResetEmail(auth, normalizeResetEmail(email), getPasswordResetSettings(role));
};
