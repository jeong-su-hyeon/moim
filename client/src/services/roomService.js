import api from './api.js';

/**
 * @typedef {{ id: string, title: string, hostId: string, status: string, participants: UserInfo[] }} Room
 */

export const getMyRooms = () => api.get('/rooms');

export const createRoom = (title) => api.post('/rooms', { title });

export const getRoom = (roomId) => api.get(`/rooms/${roomId}`);

export const joinRoom = (roomId) => api.post(`/rooms/${roomId}/join`);

export const deleteRoom = (roomId) => api.delete(`/rooms/${roomId}`);

export const confirmRoom = (roomId, date, placeId = null) =>
  api.post(`/rooms/${roomId}/confirm`, { date, placeId });

export const unconfirmRoom = (roomId) =>
  api.delete(`/rooms/${roomId}/confirm`);
