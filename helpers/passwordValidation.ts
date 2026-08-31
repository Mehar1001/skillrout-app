export interface PasswordCheck {
  label: string;
  met: boolean;
}

export const getPasswordChecks = (password: string): PasswordCheck[] => [
  { label: '10–128 characters', met: password.length >= 10 && password.length <= 128 },
  { label: 'At least one letter', met: /[A-Za-z]/.test(password) },
  { label: 'At least one number', met: /\d/.test(password) },
  { label: 'At least one special character (@$!%*?&)', met: /[@$!%*?&]/.test(password) },
];

export const isPasswordValid = (password: string): boolean =>
  getPasswordChecks(password).every(check => check.met);
