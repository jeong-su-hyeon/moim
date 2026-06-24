export const MAX_PARTICIPANTS = 10;

export const ROOM_STATUS = {
  ACTIVE: 'ACTIVE',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
};

export const TRANSPORT = {
  TRANSIT: 'TRANSIT',
  CAR: 'CAR',
  WALK: 'WALK',
};

export const TABS = {
  DATE: 'date',
  PLACE: 'place',
  RESULT: 'result',
};

export const PARTICIPANT_COLORS = [
  { key: 'RED', hex: '#E53935', label: '빨강' },
  { key: 'ORANGE', hex: '#FB8C00', label: '주황' },
  { key: 'YELLOW', hex: '#FDD835', label: '노랑' },
  { key: 'GREEN', hex: '#43A047', label: '초록' },
  { key: 'BLUE', hex: '#1E88E5', label: '파랑' },
  { key: 'NAVY', hex: '#1A237E', label: '남색' },
  { key: 'PURPLE', hex: '#8E24AA', label: '보라' },
  { key: 'BROWN', hex: '#6D4C41', label: '갈색' },
  { key: 'BLACK', hex: '#212121', label: '검정' },
  { key: 'PINK', hex: '#EC407A', label: '분홍' },
];

export const colorHex = (key) =>
  PARTICIPANT_COLORS.find((c) => c.key === key)?.hex ?? '#999';

export const API_PATHS = {
  AUTH: {
    SIGNUP: '/auth/signup',
    LOGIN: '/auth/login',
    REFRESH: '/auth/refresh',
  },
  ROOMS: '/rooms',
};
