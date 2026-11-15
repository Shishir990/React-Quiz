// Same rule as the server (QuizApp_Backend/Utils/validate.js)
export const PASSWORD_MIN = 8;

// 0–4: length, mixed case + digits, and symbols each add a point
export function getStrength(password) {
  let score = 0;
  if (password.length >= PASSWORD_MIN) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}
