const BASE = 'http://localhost:8080/api';

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