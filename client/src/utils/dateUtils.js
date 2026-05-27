/**
 * Date → 'YYYY-MM-DD' 문자열
 * @param {Date} date
 */
export const toDateString = (date) => date.toISOString().slice(0, 10);

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
