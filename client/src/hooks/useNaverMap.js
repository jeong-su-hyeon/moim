import { useEffect, useRef } from 'react';

/**
 * Naver 지도 초기화 훅
 * @param {object} options naver.maps.Map 생성 옵션
 */
export default function useNaverMap(options = {}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!window.naver?.maps) return;

    mapRef.current = new window.naver.maps.Map(containerRef.current, {
      center: new window.naver.maps.LatLng(37.5665, 126.978),
      zoom: 13,
      ...options,
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, []);

  return { containerRef, mapRef };
}
