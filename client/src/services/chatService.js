import api from './api.js';

/**
 * @typedef {{ id: string, userId: string, content: string, sentAt: string }} ChatMessage
 */

export const getMessages = (roomId, cursor, size = 50) =>
  api.get(`/rooms/${roomId}/messages`, { params: { cursor, size } });
