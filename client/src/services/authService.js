import api from './api.js';

/**
 * @typedef {{ accessToken: string, refreshToken: string }} TokenResponse
 * @typedef {{ id: string, email: string, name: string, profileUrl: string }} UserInfo
 */

export const signup = (email, password, name) =>
  api.post('/auth/signup', { email, password, name });

export const login = (email, password) =>
  api.post('/auth/login', { email, password });

export const refresh = () =>
  api.post('/auth/refresh', {}, { withCredentials: true });
