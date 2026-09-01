import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getPasswordResetSettings,
  isValidResetEmail,
  normalizeResetEmail,
  SKILLROUT_WEB_URL,
} from './passwordReset';

describe('password reset helpers', () => {
  it('normalizes email addresses', () => {
    assert.equal(normalizeResetEmail('  Employee@Example.COM  '), 'employee@example.com');
  });

  it('validates normalized email addresses', () => {
    assert.equal(isValidResetEmail(' Employee@Example.com '), true);
    assert.equal(isValidResetEmail('employee.example.com'), false);
    assert.equal(isValidResetEmail(''), false);
  });

  it('creates role-specific continuation settings', () => {
    assert.deepEqual(getPasswordResetSettings('employee'), {
      url: `${SKILLROUT_WEB_URL}/employee/login?reset=success`,
      handleCodeInApp: false,
    });
    assert.deepEqual(getPasswordResetSettings('owner'), {
      url: `${SKILLROUT_WEB_URL}/owner/login?reset=success`,
      handleCodeInApp: false,
    });
  });
});
