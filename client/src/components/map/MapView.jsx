import { useEffect, useRef, useState } from 'react';
import useNaverMap from '../../hooks/useNaverMap.js';
import useLocationStore from '../../stores/useLocationStore.js';
import useRoomStore from '../../stores/useRoomStore.js';
import { registerPlace, deletePlace, getPlaces, searchPlaces, togglePlaceLike, updatePlaceCategory } from '../../services/locationService.js';
import useAuthStore from '../../stores/useAuthStore.js';
import CategoryModal from './CategoryModal.jsx';
import { colorHex } from '../../constants/index.js';
import styles from './MapView.module.css';

const CATEGORIES = [
  { value: 'RESTAURANT', label: '식당',   emoji: '🍽️' },
  { value: 'CAFE',       label: '카페',   emoji: '☕' },
  { value: 'ACTIVITY',   label: '놀거리', emoji: '🎉' },
];

export default function MapView({ roomId }) {
  const { candidates, setCandidates, addCandidate, removeCandidate, updatePlaceLike, updatePlace } = useLocationStore();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { participants } = useRoomStore();
  const [activePlace, setActivePlace] = useState(null);
  const [transport, setTransport] = useState('TRANSIT');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingResult, setPendingResult] = useState(null); // 카테고리 선택 대기 중인 검색결과
  const [geoStatus, setGeoStatus] = useState('pending');
  const geoRef = useRef(null);
  const initialViewSet = useRef(false);
  const [placesLoaded, setPlacesLoaded] = useState(false);
  const [sortBy, setSortBy] = useState('created');
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverCategory, setDragOverCategory] = useState(null);
  const markerMapRef = useRef({});
  const searchContainerRef = useRef(null);

  // 장소 등록은 검색 결과 목록을 선택했을 때만 이루어진다.
  // 지도 클릭이나 후보 마커 클릭으로는 어떤 등록/이벤트도 발생하지 않는다.
  const { containerRef, mapReady, addMarker, removeMarker, panTo, setCenter, fitBounds } = useNaverMap();

  useEffect(() => {
    if (!navigator.geolocation) { setGeoStatus('denied'); return; }
    const request = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => { geoRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }; setGeoStatus('granted'); },
        () => setGeoStatus('denied'),
        { timeout: 10000 }
      );
    };
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' })
        .then((r) => r.state === 'denied' ? setGeoStatus('denied') : request())
        .catch(request);
    } else {
      request();
    }
  }, []);

  useEffect(() => {
    if (!mapReady || geoStatus === 'pending' || !placesLoaded || initialViewSet.current) return;
    initialViewSet.current = true;
    if (geoStatus === 'granted' && geoRef.current) {
      setCenter(geoRef.current.lat, geoRef.current.lng, 14);
    } else if (candidates.length > 0) {
      fitBounds(candidates.map((c) => ({ lat: c.lat, lng: c.lng })));
    }
  }, [mapReady, geoStatus, placesLoaded, candidates]);

  useEffect(() => {
    if (!roomId) return;
    // 방을 바꿔도 같은 <Room/> 컴포넌트와 지도 인스턴스가 재사용되므로,
    // 이전 방에서 찍힌 마커를 먼저 전부 지우고 새 방의 후보 장소를 불러온다.
    Object.values(markerMapRef.current).forEach((m) => removeMarker(m));
    markerMapRef.current = {};
    setCandidates([]);
    setActivePlace(null);
    initialViewSet.current = false;
    setPlacesLoaded(false);
    getPlaces(roomId)
      .then((res) => setCandidates(res.data.data ?? []))
      .catch(() => {})
      .finally(() => setPlacesLoaded(true));
  }, [roomId]);

  useEffect(() => {
    if (!mapReady) return;
    const candidateIds = new Set(candidates.map((p) => p.id));

    // candidates에서 빠진(삭제되었거나 더 이상 유효하지 않은) 마커는 지도에서 제거
    Object.keys(markerMapRef.current).forEach((id) => {
      if (!candidateIds.has(id)) {
        removeMarker(markerMapRef.current[id]);
        delete markerMapRef.current[id];
      }
    });

    // candidates에 새로 추가된 장소만 마커로 표시
    candidates.forEach((place) => {
      if (!markerMapRef.current[place.id]) {
        const m = addMarker(place.lat, place.lng, place.name, colorHex(place.registeredByColor));
        if (m) markerMapRef.current[place.id] = m;
      }
    });
  }, [mapReady, candidates]);

  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (!query) return;
    setSearching(true);
    try {
      const res = await searchPlaces(roomId, query);
      const results = res.data.data ?? [];
      setSearchResults(results.length === 0 ? [{ empty: true }] : results);
    } catch {
      setSearchResults([{ empty: true }]);
    } finally {
      setSearching(false);
    }
  };

  // 검색 결과 선택 → 카테고리 모달 열기
  const handleSelectSearchResult = (result) => {
    setSearchResults([]);
    setSearchQuery('');
    panTo(result.lat, result.lng);
    setPendingResult(result);
  };

  // 카테고리 확인 → 장소 등록
  const handleCategoryConfirm = async (category) => {
    if (!pendingResult) return;
    const result = pendingResult;
    setPendingResult(null);
    setSaving(true);
    try {
      const res = await registerPlace(roomId, result.name, result.address, result.lat, result.lng, category);
      const place = res.data.data;
      addCandidate(place);
      const m = addMarker(place.lat, place.lng, place.name, colorHex(place.registeredByColor));
      if (m) markerMapRef.current[place.id] = m;
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const handleLike = async (place) => {
    const wasLiked = place.likedByMe;
    const optimisticCount = (place.likeCount ?? 0) + (wasLiked ? -1 : 1);
    const optimisticIds = wasLiked
      ? (place.likedUserIds ?? []).filter((id) => id !== currentUserId)
      : [...(place.likedUserIds ?? []), currentUserId];
    updatePlaceLike(place.id, optimisticCount, optimisticIds, currentUserId);
    try {
      const res = await togglePlaceLike(roomId, place.id);
      const data = res.data.data;
      updatePlaceLike(data.placeId, data.likeCount, data.likedUserIds, currentUserId);
    } catch (err) {
      console.error('[handleLike] failed:', err?.response?.status, err?.response?.data);
      updatePlaceLike(place.id, place.likeCount ?? 0, place.likedUserIds ?? [], currentUserId);
    }
  };

  const handleDragStart = (e, place) => {
    if (e.dataTransfer) {
      e.dataTransfer.setData('text/plain', place.id);
      e.dataTransfer.effectAllowed = 'move';
    }
    setDraggingId(place.id);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverCategory(null);
  };

  const handleCategoryDragOver = (e, category) => {
    e.preventDefault();
    setDragOverCategory(category);
  };

  const handleCategoryDrop = async (e, category) => {
    e.preventDefault();
    const placeId = e.dataTransfer?.getData('text/plain') || draggingId;
    setDraggingId(null);
    setDragOverCategory(null);
    if (!placeId) return;
    const place = candidates.find((p) => p.id === placeId);
    if (!place || place.category === category) return;

    const prevCategory = place.category;
    updatePlace({ ...place, category });
    try {
      const res = await updatePlaceCategory(roomId, placeId, category);
      updatePlace(res.data.data);
    } catch (err) {
      console.error('[handleCategoryDrop] failed:', err?.response?.status, err?.response?.data);
      updatePlace({ ...place, category: prevCategory });
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
      {/* 카테고리 선택 모달 */}
      {pendingResult && (
        <CategoryModal
          placeName={pendingResult.name}
          onConfirm={handleCategoryConfirm}
          onCancel={() => setPendingResult(null)}
        />
      )}

      {/* 검색 결과 backdrop */}
      {searchResults.length > 0 && (
        <div className={styles.searchBackdrop} onMouseDown={() => setSearchResults([])} />
      )}

      {/* 검색 바 + 결과 드롭다운 */}
      <div className={styles.searchContainer} ref={searchContainerRef}>
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
      </div>

      {!mapReady && <p className={styles.mapLoading}>지도 불러오는 중...</p>}

      <div className={styles.body}>
        <div className={styles.mapArea}>
          {/* 지도 */}
          <div className={styles.mapWrapper}>
            <div ref={containerRef} className={styles.map} />
            {geoStatus === 'pending' && (
              <div className={styles.geoOverlay}>
                <div className={styles.geoSpinner} />
                <span className={styles.geoText}>현재 위치 확인 중...</span>
              </div>
            )}
          </div>

          {/* 후보지 목록 (카테고리별 세로 구분) */}
          <div className={styles.candidateList}>
            <div className={styles.candidateTitleRow}>
              <h3 className={styles.candidateTitle}>
                후보 장소
                {saving && <span className={styles.savingDot}> 저장 중...</span>}
              </h3>
              <select
                className={styles.sortSelect}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="created">등록순</option>
                <option value="like">좋아요순</option>
              </select>
            </div>
            {CATEGORIES.map(({ value, label, emoji }) => {
              const baseList = candidates.filter((p) => p.category === value);
              const list = sortBy === 'like'
                ? [...baseList].sort((a, b) => (b.likeCount ?? 0) - (a.likeCount ?? 0))
                : baseList;
              return (
                <div key={value} className={styles.categorySection}>
                  <div className={styles.categoryHeader}>
                    <span>{emoji}</span>
                    <span>{label}</span>
                  </div>
                  <div
                    className={`${styles.categoryItems} ${dragOverCategory === value ? styles.categoryItemsDragOver : ''}`}
                    onDragOver={(e) => handleCategoryDragOver(e, value)}
                    onDragLeave={() => setDragOverCategory((c) => (c === value ? null : c))}
                    onDrop={(e) => handleCategoryDrop(e, value)}
                  >
                  {list.length === 0 ? (
                    <p className={styles.emptyMsg}>우리 {label}도 하나 골라야해!</p>
                  ) : (
                    list.map((place) => (
                      <div
                        key={place.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, place)}
                        onDragEnd={handleDragEnd}
                        className={`${styles.candidateItem} ${activePlace?.id === place.id ? styles.candidateItemActive : ''} ${draggingId === place.id ? styles.candidateItemDragging : ''}`}
                      >
                        {place.registeredBy === currentUserId && (
                          <button
                            className={styles.removeBtn}
                            onClick={(e) => { e.stopPropagation(); handleRemove(place); }}
                          >✕</button>
                        )}
                        <button
                          className={styles.candidateBtn}
                          onClick={() => { setActivePlace(place); panTo(place.lat, place.lng); }}
                        >
                          <span className={styles.placeName}>{place.name}</span>
                          <span className={styles.placeAddr}>{place.address}</span>
                          <span className={styles.registeredBy}>{place.registeredByName}</span>
                        </button>
                        <div className={styles.likeCol}>
                          <button
                            className={`${styles.likeBtn} ${place.likedByMe ? styles.likeBtnActive : ''}`}
                            onClick={(e) => { e.stopPropagation(); handleLike(place); }}
                          >
                            {place.likedByMe ? '♥' : '♡'}
                          </button>
                          <span className={styles.likeCount}>{place.likeCount ?? 0}</span>
                        </div>
                      </div>
                    ))
                  )}
                  </div>
                </div>
              );
            })}
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
