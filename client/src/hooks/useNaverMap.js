import { useEffect, useRef, useState } from 'react';

/**
 * Naver 지도 초기화 훅
 * @param {{ onMapClick?: (lat, lng, address) => void }} options
 */
export default function useNaverMap({ onMapClick } = {}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const onMapClickRef = useRef(onMapClick);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => { onMapClickRef.current = onMapClick; }, [onMapClick]);

  useEffect(() => {
    // naver.maps 로드 대기 (스크립트가 defer 없이 head에 있으므로 보통 즉시 준비됨)
    const tryInit = () => {
      if (!containerRef.current || !window.naver?.maps) return false;

      mapRef.current = new window.naver.maps.Map(containerRef.current, {
        center: new window.naver.maps.LatLng(37.5665, 126.978),
        zoom: 13,
      });

      window.naver.maps.Event.addListener(mapRef.current, 'click', (e) => {
        const lat = e.coord.lat();
        const lng = e.coord.lng();

        // 리버스 지오코딩으로 주소 획득
        window.naver.maps.Service.reverseGeocode(
          { coords: new window.naver.maps.LatLng(lat, lng), orders: 'roadaddr,addr' },
          (status, response) => {
            let address = '주소 없음';
            if (status === window.naver.maps.Service.Status.OK) {
              const items = response.v2?.results ?? [];
              const road = items.find((r) => r.name === 'roadaddr');
              const addr = items.find((r) => r.name === 'addr');
              const found = road ?? addr;
              if (found) {
                const r = found.region;
                const land = found.land;
                address = [
                  r?.area1?.name, r?.area2?.name, r?.area3?.name,
                  land?.type === '1' ? land?.name : null,
                  land?.number1 ? `${land.number1}${land.number2 ? `-${land.number2}` : ''}` : null,
                ].filter(Boolean).join(' ');
              }
            }
            onMapClickRef.current?.(lat, lng, address);
          }
        );
      });

      setMapReady(true);
      return true;
    };

    if (!tryInit()) {
      // 스크립트 아직 로딩 중이면 폴링
      const id = setInterval(() => { if (tryInit()) clearInterval(id); }, 200);
      return () => clearInterval(id);
    }

    return () => {
      mapRef.current?.destroy();
      mapRef.current = null;
    };
  }, []);

  const addMarker = (lat, lng, label) => {
    if (!mapRef.current || !window.naver?.maps) return null;
    const marker = new window.naver.maps.Marker({
      position: new window.naver.maps.LatLng(lat, lng),
      map: mapRef.current,
      title: label,
    });
    markersRef.current.push(marker);
    return marker;
  };

  const removeMarker = (marker) => {
    if (!marker) return;
    marker.setMap(null);
    markersRef.current = markersRef.current.filter((m) => m !== marker);
  };

  const panTo = (lat, lng) => {
    mapRef.current?.panTo(new window.naver.maps.LatLng(lat, lng));
  };

  return { containerRef, mapRef, mapReady, addMarker, removeMarker, panTo };
}
