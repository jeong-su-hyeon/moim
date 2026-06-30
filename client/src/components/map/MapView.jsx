import { useEffect, useRef, useState } from 'react';
import useNaverMap from '../../hooks/useNaverMap.js';
import useLocationStore from '../../stores/useLocationStore.js';
import {
  registerPlace, deletePlace, getPlaces, searchPlaces, togglePlaceLike, updatePlaceCategory,
  getMyOrigin, getMyTravelTime, saveMyOrigin,
} from '../../services/locationService.js';
import useAuthStore from '../../stores/useAuthStore.js';
import CategoryModal from './CategoryModal.jsx';
import OriginModal from './OriginModal.jsx';
import { colorHex } from '../../constants/index.js';
import styles from './MapView.module.css';

const CATEGORIES = [
  { value: 'RESTAURANT', label: '식당',   emoji: '🍽️' },
  { value: 'CAFE',       label: '카페',   emoji: '☕' },
  { value: 'ACTIVITY',   label: '놀거리', emoji: '🎉' },
];

const CATEGORY_FILTERS = [{ value: 'ALL', label: '전체', emoji: '🗂️' }, ...CATEGORIES];

const CATEGORY_MAP = CATEGORIES.reduce((acc, c) => ({ ...acc, [c.value]: c }), {});

// 백엔드가 현재 자동차(CAR) 이동시간만 계산 지원 — 대중교통/도보는 노출하지 않는다.
const TRANSPORT = 'CAR';

export default function MapView({ roomId }) {
  const {
    candidates, setCandidates, addCandidate, removeCandidate, updatePlaceLike, updatePlace,
    travelTimes, setTravelTime, myOrigin, setMyOrigin,
  } = useLocationStore();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [activePlace, setActivePlace] = useState(null);
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
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [loadingTravel, setLoadingTravel] = useState(false);
  const markerMapRef = useRef({});
  const searchContainerRef = useRef(null);

  // 출발지 입력 모달 + "나중에" 선택 시 현재 위치로 폴백할지 여부
  const [showOriginModal, setShowOriginModal] = useState(false);
  const [originLoaded, setOriginLoaded] = useState(false);
  const originFallbackPendingRef = useRef(false);

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

  // 장소 탭 진입 시 내 출발지 조회. 없으면 직접 입력을 유도하는 모달을 띄운다.
  useEffect(() => {
    if (!roomId) return;
    setOriginLoaded(false);
    originFallbackPendingRef.current = false;
    getMyOrigin(roomId)
      .then((res) => {
        const origin = res.data.data ?? null;
        setMyOrigin(origin);
        setShowOriginModal(!origin);
      })
      .catch(() => {
        setMyOrigin(null);
        setShowOriginModal(true);
      })
      .finally(() => setOriginLoaded(true));
  }, [roomId]);

  // "나중에"로 모달을 건너뛴 경우: 현재 위치 권한 확인이 끝나는 시점에 한 번만 폴백 적용.
  // 권한 확인이 모달을 닫은 시점에 아직 진행 중일 수 있어 geoStatus 변화를 별도로 감시한다.
  useEffect(() => {
    if (!originFallbackPendingRef.current || geoStatus === 'pending') return;
    originFallbackPendingRef.current = false;
    if (geoStatus === 'granted' && geoRef.current) {
      const { lat, lng } = geoRef.current;
      saveMyOrigin(roomId, lat, lng, '현재 위치')
        .then(() => setMyOrigin({ userId: currentUserId, lat, lng, label: '현재 위치' }))
        .catch(() => {});
    }
    // geoStatus === 'denied'면 출발지는 계속 null → "출발지 미입력" 상태로 노출
  }, [geoStatus, roomId, currentUserId]);

  const handleOriginConfirm = async (lat, lng, label) => {
    try {
      await saveMyOrigin(roomId, lat, lng, label);
      setMyOrigin({ userId: currentUserId, lat, lng, label });
      setShowOriginModal(false);
    } catch {
    }
  };

  const handleUseCurrentLocationForOrigin = async () => {
    if (geoStatus !== 'granted' || !geoRef.current) return;
    const { lat, lng } = geoRef.current;
    try {
      await saveMyOrigin(roomId, lat, lng, '현재 위치');
      setMyOrigin({ userId: currentUserId, lat, lng, label: '현재 위치' });
      setShowOriginModal(false);
    } catch {
    }
  };

  const handleSkipOrigin = () => {
    setShowOriginModal(false);
    if (geoStatus === 'pending') {
      originFallbackPendingRef.current = true; // geoStatus 확정되면 위 effect가 처리
    } else if (geoStatus === 'granted' && geoRef.current) {
      const { lat, lng } = geoRef.current;
      saveMyOrigin(roomId, lat, lng, '현재 위치')
        .then(() => setMyOrigin({ userId: currentUserId, lat, lng, label: '현재 위치' }))
        .catch(() => {});
    }
    // geoStatus === 'denied' → 출발지 null 유지, "출발지 미입력" 표시
  };

  useEffect(() => {
    if (!mapReady) return;
    const visiblePlaces = categoryFilter === 'ALL'
      ? candidates
      : candidates.filter((p) => p.category === categoryFilter);
    const visibleIds = new Set(visiblePlaces.map((p) => p.id));

    // 필터에서 제외되었거나 삭제된 장소의 마커는 지도에서 제거
    Object.keys(markerMapRef.current).forEach((id) => {
      if (!visibleIds.has(id)) {
        removeMarker(markerMapRef.current[id]);
        delete markerMapRef.current[id];
      }
    });

    // 필터에 새로 포함된 장소만 마커로 표시
    visiblePlaces.forEach((place) => {
      if (!markerMapRef.current[place.id]) {
        const m = addMarker(place.lat, place.lng, place.name, colorHex(place.registeredByColor));
        if (m) markerMapRef.current[place.id] = m;
      }
    });
  }, [mapReady, candidates, categoryFilter]);

  // 후보지 변경 시 내 자동차 이동 시간만 조회 (출발지 미입력 시 호출하지 않음)
  useEffect(() => {
    if (!activePlace || !roomId || !myOrigin) return;
    setLoadingTravel(true);
    getMyTravelTime(roomId, activePlace.id, TRANSPORT)
      .then((res) => setTravelTime(activePlace.id, res.data.data ?? null))
      .catch(() => setTravelTime(activePlace.id, null))
      .finally(() => setLoadingTravel(false));
  }, [activePlace, roomId, myOrigin]);

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

      {/* 출발지 입력 모달 — 장소 탭 진입 시 출발지가 없으면 자동으로 뜸 */}
      {originLoaded && showOriginModal && (
        <OriginModal
          roomId={roomId}
          currentLocationAvailable={geoStatus === 'granted'}
          onConfirm={handleOriginConfirm}
          onUseCurrentLocation={handleUseCurrentLocationForOrigin}
          onSkip={handleSkipOrigin}
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
            placeholder="장소 검색"
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
            <div className={styles.filterRow}>
              <span className={styles.pillSelectWrap}>
                <select
                  className={styles.pillSelect}
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="created">등록순</option>
                  <option value="like">좋아요순</option>
                </select>
              </span>
              <span className={styles.pillSelectWrap}>
                <select
                  className={styles.pillSelect}
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  {CATEGORY_FILTERS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </span>
              {saving && <span className={styles.savingDot}>저장 중...</span>}
            </div>

            {CATEGORIES.filter(({ value }) => categoryFilter === 'ALL' || categoryFilter === value).map(({ value, label, emoji }) => {
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
                  {list.length === 0 ? null : (
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
                          <span className={styles.placeNameRow}>
                            <span className={styles.placeName}>{place.name}</span>
                            <span className={styles.categoryBadge}>
                              {CATEGORY_MAP[place.category]?.emoji} {CATEGORY_MAP[place.category]?.label}
                            </span>
                          </span>
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
              <span><strong>{activePlace.name}</strong>까지의 자동차 이동 시간</span>
            </div>
            <div className={styles.travelList}>
              {!myOrigin ? (
                <div className={styles.originMissing}>
                  <p className={styles.emptyMsg}>출발지를 입력하면 내 이동 시간을 볼 수 있어요.</p>
                  <button className={styles.originSetBtn} onClick={() => setShowOriginModal(true)}>
                    출발지 입력하기
                  </button>
                </div>
              ) : loadingTravel ? (
                <p className={styles.emptyMsg}>조회 중...</p>
              ) : (
                <div className={styles.travelRow}>
                  <span>내 이동 시간</span>
                  <span className={styles.duration}>
                    {travelTimes[activePlace.id] ? `${travelTimes[activePlace.id].durationMin}분` : '정보 없음'}
                  </span>
                </div>
              )}
            </div>
            {myOrigin && (
              <div className={styles.originInfo}>
                <span className={styles.originLabel}>출발지: {myOrigin.label || '내 위치'}</span>
                <button className={styles.originEditBtn} onClick={() => setShowOriginModal(true)}>변경</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
