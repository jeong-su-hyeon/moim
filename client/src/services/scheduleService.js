import api from './api.js';

/**
 * @typedef {{ userId: string, availableDates: string[] }} UserSchedule
 */

export const saveMyDates = (roomId, dates) =>
  api.post(`/rooms/${roomId}/schedules`, { dates });

export const getMySchedules = (roomId) =>
  api.get(`/rooms/${roomId}/schedules/me`);

export const getAggregatedSchedules = (roomId) =>
  api.get(`/rooms/${roomId}/schedules`);
