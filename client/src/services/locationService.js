import api from './api.js';

/**
 * @typedef {{ id: string, lat: number, lng: number, label: string }} Origin
 * @typedef {{ id: string, name: string, address: string, lat: number, lng: number }} Place
 * @typedef {{ userId: string, durationMin: number, transport: string }} TravelTime
 */

export const saveMyOrigin = (roomId, lat, lng, label) =>
  api.post(`/rooms/${roomId}/origins`, { lat, lng, label });

export const getOrigins = (roomId) => api.get(`/rooms/${roomId}/origins`);

export const getPlaces = (roomId) => api.get(`/rooms/${roomId}/places`);

export const searchPlaces = (roomId, query) =>
  api.get(`/rooms/${roomId}/places/search`, { params: { query } });

export const registerPlace = (roomId, name, address, lat, lng, category) =>
  api.post(`/rooms/${roomId}/places`, { name, address, lat, lng, category });

export const deletePlace = (roomId, placeId) =>
  api.delete(`/rooms/${roomId}/places/${placeId}`);

export const getTravelTimes = (roomId, placeId, transport) =>
  api.get(`/rooms/${roomId}/places/${placeId}/travel-times`, { params: { transport } });

export const togglePlaceLike = (roomId, placeId) =>
  api.post(`/rooms/${roomId}/places/${placeId}/like`);

export const updatePlaceCategory = (roomId, placeId, category) =>
  api.patch(`/rooms/${roomId}/places/${placeId}/category`, { category });
