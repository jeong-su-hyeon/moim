import api from './api.js';

/**
 * @typedef {{ userId: string, userName: string, lat: number, lng: number, label: string }} Origin
 * @typedef {{ id: string, name: string, address: string, lat: number, lng: number }} Place
 * @typedef {{ userId: string, durationMin: number, transport: string }} TravelTime
 */

export const saveMyOrigin = (roomId, lat, lng, label) =>
  api.post(`/rooms/${roomId}/origins`, { lat, lng, label });

// 본인 출발지만 반환 (없으면 data: null)
export const getMyOrigin = (roomId) => api.get(`/rooms/${roomId}/origins`);

export const getPlaces = (roomId) => api.get(`/rooms/${roomId}/places`);

export const searchPlaces = (roomId, query) =>
  api.get(`/rooms/${roomId}/places/search`, { params: { query } });

export const registerPlace = (roomId, name, address, lat, lng, category) =>
  api.post(`/rooms/${roomId}/places`, { name, address, lat, lng, category });

export const deletePlace = (roomId, placeId) =>
  api.delete(`/rooms/${roomId}/places/${placeId}`);

// 본인 이동시간만 반환 (없으면 data: null)
export const getMyTravelTime = (roomId, placeId, transport) =>
  api.get(`/rooms/${roomId}/places/${placeId}/travel-times`, { params: { transport } });

export const togglePlaceLike = (roomId, placeId) =>
  api.post(`/rooms/${roomId}/places/${placeId}/like`);

export const updatePlaceCategory = (roomId, placeId, category) =>
  api.patch(`/rooms/${roomId}/places/${placeId}/category`, { category });
