import { useEffect, useRef, useState, useCallback } from 'react';
import useNaverMap from '../../hooks/useNaverMap.js';
import useLocationStore from '../../stores/useLocationStore.js';
import useRoomStore from '../../stores/useRoomStore.js';
import { registerPlace, deletePlace, getPlaces, searchPlaces } from '../../services/locationService.js';
import styles from './MapView.module.css';

export default function MapView({ roomId }) {
  const { candidates, setCandidates, addCandidate, removeCandidate } = useLocationStore();
  const { participants } = useRoomStore();
  const [activePlace, setActivePlace] = useState(null);
  const [transport, setTransport] = useState('TRANSIT');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  // 'pending' | 'granted' | 'denied'
  const [geoStatus, setGeoStatus] = useState('pending');
  const geoRef = useRef(null); // { lat, lng }
  const initialViewSet = useRef(false);
  const [placesLoaded, setPlacesLoaded] = useState(false);

  // 마커 map: placeId → naver.maps.Marker
  const markerMapRef = useRef({});

  const handleMapClick = useCallback(async (lat, lng, address) => {
    const name = address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    setSaving(true);
    try {
      const res = await registerPlace(roomId, name, address, lat, lng);
      const place = res.data.data;
      addCandidate(place);
      const m = addMarker(place.lat, place.lng, place.name, place.registeredByName);
      if (m) markerMapRef.current[place.id] = m;
    } catch {
      // 등록 실패 무시
    } finally {
      setSaving(false);
    }
  }, [roomId]);

  const { containerRef, mapReady, addMarker, removeMarker, panTo, setCenter, fitBounds } = useNaverMap({ onMapClick: handleMapClick });

  // 마운트 시 위치 권한 요청
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoStatus('denied');
      return;
    }

    const request = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          geoRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setGeoStatus('granted');
        },
        () => setGeoStatus('denied'),
        { timeout: 10000 }
      );
    };

    // Permissions API로 현재 상태를 먼저 확인 → 이미 denied면 팝업 없이 즉시 처리
    if (navigator.permissions) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((result) => {
          if (result.state === 'denied') {
            setGeoStatus('denied');
          } else {
            request(); // 'granted'는 팝업 없이 성공, 'prompt'는 팝업 표시
          }
        })
        .catch(request); // Permissions API 미지원 환경
    } else {
      request();
    }
  }, []);

  // 초기 뷰 설정: 지도·위치 결과·후보지 로드 세 가지가 모두 준비된 뒤 한 번만 실행
  useEffect(() => {
    if (!mapReady || geoStatus === 'pending' || !placesLoaded || initialViewSet.current) return;
    initialViewSet.current = true;

    if (geoStatus === 'granted' && geoRef.current) {
      setCenter(geoRef.current.lat, geoRef.current.lng, 14);
    } else if (candidates.length > 0) {
      fitBounds(candidates.map((c) => ({ lat: c.lat, lng: c.lng })));
    }
    // denied + 후보지 없음 → 기본값(서울) 유지
  }, [mapReady, geoStatus, placesLoaded, candidates]);

  // 방 진입 시 기존 후보지 로드
  useEffect(() => {
    if (!roomId) return;
    getPlaces(roomId)
      .then((res) => setCandidates(res.data.data ?? []))
      .catch(() => {})
      .finally(() => setPlacesLoaded(true));
  }, [roomId]);

  // 지도 준비 + 후보지 모두 갖춰졌을 때 마커 표시
  useEffect(() => {
    if (!mapReady || candidates.length === 0) return;
    candidates.forEach((place) => {
      if (!markerMapRef.current[place.id]) {
        const m = addMarker(place.lat, place.lng, place.name, place.registeredByName);
        if (m) markerMapRef.current[place.id] = m;
      }
    });
  }, [mapReady, candidates]);

  const handleSearch = async () => {
    const query = searchQuery.trim();
    console.log('[handleSearch] roomId:', roomId, 'query:', query);
    if (!query) return;
    setSearching(true);
    try {
      const res = await searchPlaces(roomId, query);
      const results = res.data.data ?? [];
      setSearchResults(results);
      if (results.length === 0) setSearchResults([{ empty: true }]);
    } catch (err) {
      console.error('[searchPlaces]', err.response?.status, err.response?.data);
      setSearchResults([{ empty: true }]);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectSearchResult = async (result) => {
    setSearchResults([]);
    setSearchQuery('');
    panTo(result.lat, result.lng);
    setSaving(true);
    try {
      const res = await registerPlace(roomId, result.name, result.address, result.lat, result.lng);
      const place = res.data.data;
      addCandidate(place);
      const m = addMarker(place.lat, place.lng, place.name, place.registeredByName);
      if (m) markerMapRef.current[place.id] = m;
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (place) => {
    try {
      await deletePlace(roomId, place.id);
      removeCandidate(place.id);
      const m = markerMapRef.current[place.id];
      removeMarker(m);
      delete markerMapRef.current[place.id];
      if (activePlace?.id === place.id) setActivePlace(null);
    } catch {
    }
  };

  return (
    <div className={styles.wrap}>
      {/* 검색 바 */}
      <div className={styles.searchBar}>
        <input
          className={styles.searchInput}
          placeholder="장소명 검색 (예: 강남역, 스타벅스 강남점)"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setSearchResults([]); }}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button className={styles.searchBtn} onClick={handleSearch} disabled={searching}>
          {searching ? '검색 중' : '검색'}
        </button>
      </div>

      {/* 검색 결과 드롭다운 */}
      {searchResults.length > 0 && (
        <ul className={styles.searchResults}>
          {searchResults[0]?.empty ? (
            <li className={styles.searchResultEmpty}>검색 결과가 없습니다.</li>
          ) : (
            searchResults.map((r, i) => (
              <li key={i}>
                <button className={styles.searchResultItem} onClick={() => handleSelectSearchResult(r)}>
                  <span className={styles.searchResultName}>{r.name}</span>
                  <span className={styles.searchResultAddr}>{r.address}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}

      {!mapReady && (
        <p className={styles.mapLoading}>지도 불러오는 중...</p>
      )}

      <div className={styles.body}>
        <div className={styles.mapArea}>
          {/* 지도 + 위치 로딩 오버레이 */}
          <div className={styles.mapWrapper}>
            <div ref={containerRef} className={styles.map} />
            {geoStatus === 'pending' && (
              <div className={styles.geoOverlay}>
                <div className={styles.geoSpinner} />
                <span className={styles.geoText}>현재 위치 확인 중...</span>
              </div>
            )}
          </div>

          {/* 후보지 목록 */}
          <div className={styles.candidateList}>
            <h3 className={styles.candidateTitle}>
              후보 장소
              {saving && <span className={styles.savingDot}> 저장 중...</span>}
            </h3>
            {candidates.length === 0 ? (
              <p className={styles.emptyMsg}>지도를 클릭하거나 주소를 검색해 후보지를 추가하세요.</p>
            ) : (
              candidates.map((place) => (
                <div
                  key={place.id}
                  className={`${styles.candidateItem} ${activePlace?.id === place.id ? styles.candidateItemActive : ''}`}
                >
                  <button
                    className={styles.candidateBtn}
                    onClick={() => {
                      setActivePlace(place);
                      panTo(place.lat, place.lng);
                    }}
                  >
                    <span className={styles.placeName}>{place.name}</span>
                    <span className={styles.placeAddr}>{place.address}</span>
                  </button>
                  <button className={styles.removeBtn} onClick={() => handleRemove(place)}>✕</button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 이동 시간 패널 */}
        {activePlace && (
          <div className={styles.travelPanel}>
            <div className={styles.travelHeader}>
              <span><strong>{activePlace.name}</strong>까지의 이동 시간</span>
              <div className={styles.transportTabs}>
                {[['TRANSIT', '대중교통'], ['CAR', '자동차'], ['WALK', '도보']].map(([key, label]) => (
                  <button
                    key={key}
                    className={`${styles.transportBtn} ${transport === key ? styles.transportBtnActive : ''}`}
                    onClick={() => setTransport(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.travelList}>
              {participants.length === 0 ? (
                <p className={styles.emptyMsg}>참여자 이동 시간 정보가 없습니다.</p>
              ) : (
                participants.map((p) => (
                  <div key={p.id} className={styles.travelRow}>
                    <span>{p.name}</span>
                    <span className={styles.duration}>-</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
