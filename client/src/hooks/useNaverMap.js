import { useEffect, useRef, useState } from 'react';

// 핀 SVG 크기
const PIN_W = 24;
const PIN_H = 34; // 꼭짓점(tip)이 SVG 좌표 (12, 34) = anchor 기준 (0, 0)

// 겹침 판단 거리(px): 라벨이 양옆으로 퍼지므로 충분히 크게
const OVERLAP_THRESHOLD = 80;

const LABEL_BASE = [
  'position:absolute',
  'top:-28px',
  'font-size:11px',
  'font-weight:600',
  'white-space:nowrap',
  'max-width:80px',
  'overflow:hidden',
  'text-overflow:ellipsis',
  'line-height:1.4',
  'padding:1px 5px',
  'border-radius:3px',
  'background:rgba(255,255,255,0.93)',
  'box-shadow:0 1px 3px rgba(0,0,0,0.2)',
].join(';');

function uid() {
  return `mk-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function pinContent(placeName, username, labelId, userLabelId) {
  const gap = PIN_W / 2 + 5; // 핀 가장자리에서 라벨까지 여백(px)
  return `
    <div style="position:relative;width:0;height:0;pointer-events:none;cursor:pointer">
      <svg
        style="position:absolute;left:${-PIN_W / 2}px;top:${-PIN_H}px"
        width="${PIN_W}" height="${PIN_H}" viewBox="0 0 24 34"
        xmlns="http://www.w3.org/2000/svg">
        <path
          d="M12 0C5.4 0 0 5.4 0 12C0 21 12 34 12 34C12 34 24 21 24 12C24 5.4 18.6 0 12 0Z"
          fill="#0068C3" stroke="#fff" stroke-width="1.5"/>
        <circle cx="12" cy="12" r="4.5" fill="white"/>
      </svg>
      <!-- 장소명: 핀 오른쪽 -->
      <span id="${labelId}" style="${LABEL_BASE};left:${gap}px;color:#0068C3;">
        ${placeName}
      </span>
      <!-- 등록자: 핀 왼쪽 (반대편) -->
      ${username ? `
        <span id="${userLabelId}" style="${LABEL_BASE};right:${gap}px;color:#555;text-align:right;">
          ${username}
        </span>
      ` : ''}
    </div>
  `;
}

export default function useNaverMap({ onMapClick } = {}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  // { marker, lat, lng, labelId, userLabelId }[]
  const metaRef = useRef([]);
  const onMapClickRef = useRef(onMapClick);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => { onMapClickRef.current = onMapClick; }, [onMapClick]);

  const syncLabels = () => {
    const map = mapRef.current;
    if (!map || !window.naver?.maps) return;
    const metas = metaRef.current;
    if (metas.length === 0) return;

    const proj = map.getProjection();
    const offsets = metas.map(({ lat, lng }) =>
      proj.fromCoordToOffset(new window.naver.maps.LatLng(lat, lng))
    );

    let overlap = false;
    outer: for (let i = 0; i < offsets.length; i++) {
      for (let j = i + 1; j < offsets.length; j++) {
        const dx = offsets[i].x - offsets[j].x;
        const dy = offsets[i].y - offsets[j].y;
        if (Math.sqrt(dx * dx + dy * dy) < OVERLAP_THRESHOLD) {
          overlap = true;
          break outer;
        }
      }
    }

    metas.forEach(({ labelId, userLabelId }) => {
      const show = overlap ? 'none' : 'block';
      const lEl = document.getElementById(labelId);
      const uEl = document.getElementById(userLabelId);
      if (lEl) lEl.style.display = show;
      if (uEl) uEl.style.display = show;
    });
  };

  useEffect(() => {
    const tryInit = () => {
      if (!containerRef.current || !window.naver?.maps) return false;

      mapRef.current = new window.naver.maps.Map(containerRef.current, {
        center: new window.naver.maps.LatLng(37.5665, 126.978),
        zoom: 13,
      });

      window.naver.maps.Event.addListener(mapRef.current, 'click', (e) => {
        const lat = e.coord.lat();
        const lng = e.coord.lng();

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

      window.naver.maps.Event.addListener(mapRef.current, 'zoom_changed', syncLabels);

      setMapReady(true);
      return true;
    };

    if (!tryInit()) {
      const id = setInterval(() => { if (tryInit()) clearInterval(id); }, 200);
      return () => clearInterval(id);
    }

    return () => {
      mapRef.current?.destroy();
      mapRef.current = null;
    };
  }, []);

  /**
   * @param {number} lat
   * @param {number} lng
   * @param {string} label - 장소명 (핀 오른쪽)
   * @param {string} [username] - 등록자명 (핀 왼쪽)
   */
  const addMarker = (lat, lng, label, username = '') => {
    if (!mapRef.current || !window.naver?.maps) return null;
    const labelId = uid();
    const userLabelId = uid();
    const marker = new window.naver.maps.Marker({
      position: new window.naver.maps.LatLng(lat, lng),
      map: mapRef.current,
      icon: {
        content: pinContent(label, username, labelId, userLabelId),
        // anchor = 핀 꼭짓점(tip): content div의 (0,0)이 좌표와 일치
        anchor: new window.naver.maps.Point(0, 0),
      },
    });
    metaRef.current.push({ marker, lat, lng, labelId, userLabelId });
    setTimeout(syncLabels, 0);
    return marker;
  };

  const removeMarker = (marker) => {
    if (!marker) return;
    marker.setMap(null);
    metaRef.current = metaRef.current.filter((m) => m.marker !== marker);
    setTimeout(syncLabels, 0);
  };

  const panTo = (lat, lng) => {
    mapRef.current?.panTo(new window.naver.maps.LatLng(lat, lng));
  };

  return { containerRef, mapRef, mapReady, addMarker, removeMarker, panTo };
}
