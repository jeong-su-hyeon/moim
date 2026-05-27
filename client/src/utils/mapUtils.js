/**
 * LatLng 객체 생성 (naver.maps 준비 후 사용)
 * @param {number} lat
 * @param {number} lng
 */
export const latLng = (lat, lng) => new window.naver.maps.LatLng(lat, lng);

/**
 * 마커 생성
 * @param {object} map naver.maps.Map 인스턴스
 * @param {number} lat
 * @param {number} lng
 * @param {string} title
 */
export const createMarker = (map, lat, lng, title = '') =>
  new window.naver.maps.Marker({
    position: latLng(lat, lng),
    map,
    title,
  });

/**
 * 마커 제거
 * @param {object} marker
 */
export const removeMarker = (marker) => {
  if (marker) marker.setMap(null);
};
