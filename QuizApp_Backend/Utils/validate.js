// Checks for auth input. Each returns an error message, or '' when the value is fine.
// Values must be plain strings: an object like { "$ne": null } in a login body would
// otherwise reach MongoDB as a query operator and match an arbitrary account.

const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128; // bcrypt only reads the first 72 bytes; this keeps hashing cheap

const isText = (v) => typeof v === 'string';

// "  Ana@Example.COM " -> "ana@example.com", or '' when it isn't a usable string
const normalizeEmail = (v) => (isText(v) ? v.trim().toLowerCase() : '');

const emailError = (email) =>
  email && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? '' : 'Enter a valid email address';

const nameError = (name) => {
  if (!isText(name) || !name.trim()) return 'Name is required';
  return name.trim().length > 60 ? 'Keep the name under 60 characters' : '';
};

const newPasswordError = (password, label = 'Password') => {
  if (!isText(password) || password.length < PASSWORD_MIN) return `${label} must be at least ${PASSWORD_MIN} characters`;
  return password.length > PASSWORD_MAX ? `${label} must be at most ${PASSWORD_MAX} characters` : '';
};

module.exports = { isText, normalizeEmail, emailError, nameError, newPasswordError, PASSWORD_MIN };
