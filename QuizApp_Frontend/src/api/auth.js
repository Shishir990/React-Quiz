const BASE = '/api';

export const authFetch = async (url, options = {}) => {
  const response = await fetch(`${BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      ...options.headers,
    },
  });
  return response.json();
};

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
