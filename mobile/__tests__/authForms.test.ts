import { hasErrors, validateLogin, validateRegister } from '@/validation/authForms';

const valid = { email: 'priya@example.com', password: 'a-long-enough-password', displayName: 'Priya S.' };

describe('validateRegister', () => {
  it('accepts valid input, including non-English names', () => {
    expect(validateRegister(valid)).toEqual({});
    expect(validateRegister({ ...valid, displayName: 'प्रिया शर्मा' })).toEqual({});
  });

  it('requires a password of at least 12 characters', () => {
    expect(validateRegister({ ...valid, password: 'short' }).password).toContain('at least 12');
  });

  it('rejects passwords the backend would refuse as too long', () => {
    expect(validateRegister({ ...valid, password: 'x'.repeat(65) }).password).toContain('too long');
    // 30 emoji are fewer than 64 characters but more than 72 bytes.
    expect(validateRegister({ ...valid, password: '🙂'.repeat(30) }).password).toContain('too long');
  });

  it('rejects display names with HTML or script characters', () => {
    expect(validateRegister({ ...valid, displayName: '<script>' }).displayName).toBeDefined();
    expect(validateRegister({ ...valid, displayName: '   ' }).displayName).toBeDefined();
  });

  it('rejects malformed emails', () => {
    expect(validateRegister({ ...valid, email: 'not-an-email' }).email).toBeDefined();
    expect(validateRegister({ ...valid, email: '' }).email).toBeDefined();
  });
});

describe('validateLogin', () => {
  it('only checks that fields are filled in sensibly', () => {
    expect(validateLogin({ email: 'priya@example.com', password: 'anything' })).toEqual({});
    expect(hasErrors(validateLogin({ email: '', password: '' }))).toBe(true);
  });
});
