import { apiFetch } from './client';
import { readJson } from './readJson';

// Resolves with the JSON body whatever the status (callers check for the data they need)
export const authFetch = async (url, options = {}) => readJson(await apiFetch(url, options));

export const loginApi = async (email, password) => {
  try {
    const data = await authFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return data;
  } catch (err) {
    throw new Error(err.message || 'Login failed');
  }
};

export const registerApi = async (userData) => {
  try {
    const data = await authFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    return data;
  } catch (err) {
    throw new Error(err.message || 'Registration failed');
  }
};

export const getMeApi = async () => {
  try {
    const data = await authFetch('/auth/me');
    return data;
  } catch (err) {
    throw new Error(err.message || 'Failed to fetch user');
  }
};

export const changePasswordApi = async (currentPassword, newPassword) => {
  try {
    const data = await authFetch('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    return data;
  } catch (err) {
    throw new Error(err.message || 'Failed to change password');
  }
};

export const forgotPasswordApi = async (email) => {
  try {
    const data = await authFetch('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return data;
  } catch (err) {
    throw new Error(err.message || 'Failed to send reset link');
  }
};

export const resetPasswordApi = async (token, password) => {
  try {
    const data = await authFetch('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
    return data;
  } catch (err) {
    throw new Error(err.message || 'Failed to reset password');
  }
};

export const checkResetTokenApi = async (token) => {
  try {
    const data = await authFetch('/auth/reset-password/check', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
    return data;
  } catch (err) {
    throw new Error(err.message || 'Failed to check reset link');
  }
};

// Ends this device's session (clears the cookies). Never throws: signing out locally still happens.
export const logoutApi = async () => {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } catch {
    // Offline: the cookies expire on their own
  }
};

// Ends every session of this account, on every device
export const logoutAllApi = async () => authFetch('/auth/logout-all', { method: 'POST' });

// ── Profile ──
export const updateProfileApi = async (name) =>
  authFetch('/auth/profile', { method: 'PUT', body: JSON.stringify({ name }) });

// Emails a confirmation link to the new address; the email changes once it's opened
export const requestEmailChangeApi = async (email, password) =>
  authFetch('/auth/email-change', { method: 'POST', body: JSON.stringify({ email, password }) });

export const cancelEmailChangeApi = async () => authFetch('/auth/email-change', { method: 'DELETE' });

export const confirmEmailChangeApi = async (token) =>
  authFetch('/auth/email-change/confirm', { method: 'POST', body: JSON.stringify({ token }) });

// Devices signed in to this account (this one is marked `current`)
export const getSessionsApi = async () => authFetch('/auth/sessions');

// Signs out one other device
export const revokeSessionApi = async (id) =>
  authFetch(`/auth/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' });
