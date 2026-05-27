import { useState } from "react";
import useNaverMap from "../../hooks/useNaverMap.js";
import useLocationStore from "../../stores/useLocationStore.js";
import useRoomStore from "../../stores/useRoomStore.js";
import styles from "./MapView.module.css";

export default function MapView({ roomId }) {
  const { containerRef } = useNaverMap();
  const { candidates, addCandidate, removeCandidate } = useLocationStore();
  const { participants } = useRoomStore();
  const [activePlace, setActivePlace] = useState(null);
  const [transport, setTransport] = useState("TRANSIT");
  const [searchQuery, setSearchQuery] = useState("");

  const travelTimes = useLocationStore(
    (s) => (activePlace ? (s.travelTimes[activePlace.id] ?? []) : [])
  );

  const handleSearch = () => {
    alert("장소 검색은 Naver API 연동 후 동작합니다.");
  };

  return (
    <div className={styles.wrap}>
      {/* 검색 바 */}
      <div className={styles.searchBar}>
        <input
          className={styles.searchInput}
          placeholder="장소 검색 (예: 강남역 카페)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <button className={styles.searchBtn} onClick={handleSearch}>검색</button>
      </div>

      <div className={styles.body}>
        {/* 지도 + 후보지 목록 */}
        <div className={styles.mapArea}>
          {/* 지도 */}
          <div ref={containerRef} className={styles.map}>
            <div className={styles.mapPlaceholder}>
              {typeof window !== "undefined" && !window.naver?.maps
                ? "지도 준비 중\n(Naver Maps API 키 설정 후 표시)"
                : null}
            </div>
          </div>

          {/* 후보지 사이드 */}
          <div className={styles.candidateList}>
            <h3 className={styles.candidateTitle}>후보 장소</h3>
            {candidates.length === 0 ? (
              <p className={styles.emptyMsg}>지도를 클릭하거나 검색으로 후보지를 추가하세요.</p>
            ) : (
              candidates.map((place) => (
                <div
                  key={place.id}
                  className={`${styles.candidateItem} ${activePlace?.id === place.id ? styles.candidateItemActive : ""}`}
                >
                  <button
                    className={styles.candidateBtn}
                    onClick={() => setActivePlace(place)}
                  >
                    <span className={styles.placeName}>{place.name}</span>
                    <span className={styles.placeAddr}>{place.address}</span>
                  </button>
                  <button
                    className={styles.removeBtn}
                    onClick={() => {
                      removeCandidate(place.id);
                      if (activePlace?.id === place.id) setActivePlace(null);
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 이동 시간 패널 */}
        {activePlace && (
          <div className={styles.travelPanel}>
            <div className={styles.travelHeader}>
              <span><strong>{activePlace.name}</strong> 까지의 이동 시간</span>
              <div className={styles.transportTabs}>
                {[["TRANSIT", "대중교통"], ["CAR", "자동차"], ["WALK", "도보"]].map(([key, label]) => (
                  <button
                    key={key}
                    className={`${styles.transportBtn} ${transport === key ? styles.transportBtnActive : ""}`}
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
                participants.map((p) => {
                  const tt = travelTimes.find((t) => t.userId === p.id && t.transport === transport);
                  return (
                    <div key={p.id} className={styles.travelRow}>
                      <span>{p.name}</span>
                      <span className={styles.duration}>{tt ? `${tt.durationMin}분` : "-"}</span>
                    </div>
                  );
                })
              )}
            </div>

            <button
              className={styles.confirmBtn}
              onClick={() => alert("장소 확정은 서버 연동 후 동작합니다.")}
            >
              이 장소로 확정
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
