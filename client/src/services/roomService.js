import api from './api.js';

/**
 * @typedef {{ id: string, title: string, hostId: string, status: string, participants: UserInfo[] }} Room
 */

export const getMyRooms = () => api.get('/rooms');

export const createRoom = (title, maxParticipants, color) =>
  api.post('/rooms', { title, maxParticipants, color });

export const getRoom = (roomId) => api.get(`/rooms/${roomId}`);

export const joinRoom = (roomId, color) => api.post(`/rooms/${roomId}/join`, { color });

export const updateRoom = (roomId, { title, maxParticipants } = {}) =>
  api.patch(`/rooms/${roomId}`, { title, maxParticipants });

export const deleteRoom = (roomId) => api.delete(`/rooms/${roomId}`);

export const leaveRoom = (roomId, newHostId = null) => {
  const params = newHostId ? { newHostId } : {};
  return api.delete(`/rooms/${roomId}/leave`, { params });
};

export const confirmRoom = (roomId, date, placeId = null) =>
  api.post(`/rooms/${roomId}/confirm`, { date, placeId });

export const unconfirmRoom = (roomId) =>
  api.delete(`/rooms/${roomId}/confirm`);
