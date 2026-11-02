/**
 * Form checks that mirror the backend's rules (backend/.../user/ValidationRules.java),
 * so users get instant feedback. The backend still checks everything again.
 */

export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 64;
export const DISPLAY_NAME_MAX = 50;
export const EMAIL_MAX = 254;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DISPLAY_NAME_PATTERN = /^[\p{L}\p{M}\p{N} .'_-]+$/u;

export type FieldErrors<T extends string> = Partial<Record<T, string>>;

/** Number of bytes a string takes in UTF-8 (the backend's BCrypt limit is 72 bytes). */
function utf8Length(value: string): number {
  return encodeURIComponent(value).replace(/%[0-9A-F]{2}/gi, 'x').length;
}

function checkEmail(email: string): string | undefined {
  const value = email.trim();
  if (!value) return 'Please enter your email.';
  if (value.length > EMAIL_MAX || !EMAIL_PATTERN.test(value)) return 'Please enter a valid email address.';
  return undefined;
}

/** Returns an error message, or undefined if the display name is fine. Used by Register and Edit profile. */
export function validateDisplayName(displayName: string): string | undefined {
  const name = displayName.trim();
  if (!name) return 'Please enter a display name.';
  if (name.length > DISPLAY_NAME_MAX) return `Display name can be at most ${DISPLAY_NAME_MAX} characters.`;
  if (!DISPLAY_NAME_PATTERN.test(name)) return "Use only letters, numbers, spaces and . ' _ -";
  return undefined;
}

export function validateLogin(input: { email: string; password: string }): FieldErrors<'email' | 'password'> {
  const errors: FieldErrors<'email' | 'password'> = {};
  const email = checkEmail(input.email);
  if (email) errors.email = email;
  if (!input.password) errors.password = 'Please enter your password.';
  return errors;
}

export function validateRegister(input: {
  email: string;
  password: string;
  displayName: string;
}): FieldErrors<'email' | 'password' | 'displayName'> {
  const errors: FieldErrors<'email' | 'password' | 'displayName'> = {};

  const displayName = validateDisplayName(input.displayName);
  if (displayName) errors.displayName = displayName;

  const email = checkEmail(input.email);
  if (email) errors.email = email;

  if (input.password.length < PASSWORD_MIN) {
    errors.password = `Password must be at least ${PASSWORD_MIN} characters.`;
  } else if (input.password.length > PASSWORD_MAX || utf8Length(input.password) > 72) {
    errors.password = `Password is too long (maximum ${PASSWORD_MAX} characters).`;
  }

  return errors;
}

export function hasErrors(errors: object): boolean {
  return Object.keys(errors).length > 0;
}

export type PasswordStrength = { level: 0 | 1 | 2 | 3; label: string };

/**
 * A simple, honest strength guide based on LENGTH ONLY. Length is the single biggest factor
 * in how hard a password is to guess. We don't pretend to measure more than that.
 */
export function passwordStrength(password: string): PasswordStrength {
  const length = password.length;
  if (length < PASSWORD_MIN) return { level: 0, label: `Too short (${length}/${PASSWORD_MIN})` };
  if (length < 16) return { level: 1, label: 'Okay' };
  if (length < 20) return { level: 2, label: 'Good' };
  return { level: 3, label: 'Strong' };
}
