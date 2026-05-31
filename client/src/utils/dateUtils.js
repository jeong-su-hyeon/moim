/**
 * Date → 'YYYY-MM-DD' 문자열
 * @param {Date} date
 */
// toISOString()은 UTC 기준이라 한국(UTC+9) 자정 이후 날짜가 달라질 수 있음 → 로컬 기준으로 변환
export const toDateString = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * 'YYYY-MM-DD' → Date
 * @param {string} str
 */
export const fromDateString = (str) => new Date(str + 'T00:00:00');

/**
 * 주어진 연·월의 1일 Date
 */
export const firstDayOf = (year, month) => new Date(year, month, 1);

/**
 * 주어진 연·월의 마지막 날
 */
export const lastDayOf = (year, month) => new Date(year, month + 1, 0).getDate();

/**
 * 요일 이름 배열 (일~토)
 */
export const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
