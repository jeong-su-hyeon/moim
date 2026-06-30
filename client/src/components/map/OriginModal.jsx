import { useState } from 'react';
import { searchPlaces } from '../../services/locationService.js';
import styles from './OriginModal.module.css';

export default function OriginModal({ roomId, currentLocationAvailable, onConfirm, onUseCurrentLocation, onSkip }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    try {
      const res = await searchPlaces(roomId, q);
      const data = res.data.data ?? [];
      setResults(data.length === 0 ? [{ empty: true }] : data);
    } catch {
      setResults([{ empty: true }]);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <p className={styles.title}>출발지를 입력해주세요.</p>
        <p className={styles.desc}>
          입력한 출발지로 후보 장소까지의 내 이동 시간을 계산해요.
          지금 계신 곳이 출발지가 아닐 수도 있으니 직접 검색해서 선택해주세요.
        </p>

        <div className={styles.searchBar}>
          <input
            className={styles.searchInput}
            placeholder="출발지 주소 검색"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setResults([]); }}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button className={styles.searchBtn} onClick={handleSearch} disabled={searching}>
            {searching ? '검색 중' : '검색'}
          </button>
        </div>

        {results.length > 0 && (
          <ul className={styles.results}>
            {results[0]?.empty ? (
              <li className={styles.resultEmpty}>검색 결과가 없습니다.</li>
            ) : (
              results.map((r, i) => (
                <li key={i}>
                  <button
                    className={styles.resultItem}
                    onClick={() => onConfirm(r.lat, r.lng, r.name || r.address)}
                  >
                    <span className={styles.resultName}>{r.name}</span>
                    <span className={styles.resultAddr}>{r.address}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}

        <div className={styles.actions}>
          <button className={styles.skipBtn} onClick={onSkip}>나중에</button>
          {currentLocationAvailable && (
            <button className={styles.geoBtn} onClick={onUseCurrentLocation}>현재 위치 사용</button>
          )}
        </div>
      </div>
    </div>
  );
}
