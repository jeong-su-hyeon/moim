import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { TABS } from '../../constants/index.js';
import CalendarView from '../calendar/CalendarView.jsx';
import MapView from '../map/MapView.jsx';
import ChatPanel from '../chat/ChatPanel.jsx';
import Toast from '../common/Toast.jsx';
import useWebSocket from '../../hooks/useWebSocket.js';
import useScheduleStore from '../../stores/useScheduleStore.js';
import useRoomStore from '../../stores/useRoomStore.js';
import styles from './RoomLayout.module.css';

const NAV_ITEMS = [
  { tab: TABS.DATE, label: '날짜\n선택', icon: '📅' },
  { tab: TABS.PLACE, label: '장소\n선택', icon: '📍' },
  { tab: TABS.RESULT, label: '최종\n약속', icon: '✅' },
];

export default function RoomLayout({ room }) {
  const [activeTab, setActiveTab] = useState(TABS.DATE);
  const [copyToast, setCopyToast] = useState(null);
  const { setAggregated, aggregated } = useScheduleStore();

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/room/${room?.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyToast('초대 링크가 복사되었습니다.');
    } catch {
      // clipboard API 차단 환경 fallback
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopyToast('초대 링크가 복사되었습니다.');
    }
  };

  const onScheduleUpdate = useCallback(
    (aggregated) => setAggregated(aggregated),
    [setAggregated]
  );
  const { sendMessage } = useWebSocket(room?.id, { onScheduleUpdate });

  return (
    <div className={styles.layout}>
      {/* 왼쪽 세로 네비게이션 */}
      <nav className={styles.nav}>
        <div className={styles.navTitle}>
          <span className={styles.navTitleText}>{room?.title ?? '모임'}</span>
          <button className={styles.copyBtn} onClick={handleCopyLink} title="초대 링크 복사">
            🔗
          </button>
        </div>
        <ul className={styles.navList}>
          {NAV_ITEMS.map(({ tab, label, icon }) => (
            <li key={tab}>
              <button
                className={`${styles.navBtn} ${activeTab === tab ? styles.navBtnActive : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                <span className={styles.navIcon}>{icon}</span>
                <span className={styles.navLabel}>{label}</span>
              </button>
            </li>
          ))}
        </ul>
        <Link to="/" className={styles.homeBtn} title="홈으로">
          🏠
        </Link>
      </nav>

      {/* 메인 콘텐츠 */}
      <main className={styles.main}>
        {activeTab === TABS.DATE && <CalendarView roomId={room?.id} />}
        {activeTab === TABS.PLACE && <MapView roomId={room?.id} />}
        {activeTab === TABS.RESULT && <ResultView room={room} aggregated={aggregated} />}
      </main>

      {/* 오른쪽 채팅 패널 */}
      <ChatPanel roomId={room?.id} sendMessage={sendMessage} />
      {copyToast && <Toast message={copyToast} onClose={() => setCopyToast(null)} />}
    </div>
  );
}

function ResultView({ room, aggregated }) {
  const { participants } = useRoomStore();
  const totalCount = participants.length || 0;

  // aggregated: { "2026-06-01": 3, "2026-06-07": 2, ... }
  const entries = Object.entries(aggregated ?? {});

  let topDates = [];
  let maxCount = 0;

  if (entries.length > 0) {
    maxCount = Math.max(...entries.map(([, c]) => Number(c)));
    topDates = entries
      .filter(([, c]) => Number(c) === maxCount)
      .map(([date]) => date)
      .sort();
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    return `${dateStr} (${weekdays[d.getDay()]})`;
  };

  return (
    <div className={styles.resultWrap}>
      <h2 className={styles.resultTitle}>최종 약속 날짜</h2>

      {entries.length === 0 ? (
        <p className={styles.resultEmpty}>아직 일정을 입력한 참여자가 없습니다.</p>
      ) : (
        <>
          {topDates.length === 1 ? (
            <div className={styles.resultBest}>
              <span className={styles.resultBestLabel}>최다 선택 날짜</span>
              <p className={styles.resultBestDate}>{formatDate(topDates[0])}</p>
              <p className={styles.resultBestCount}>
                {totalCount > 0
                  ? `${totalCount}명 중 ${maxCount}명 가능`
                  : `${maxCount}명 가능`}
              </p>
            </div>
          ) : (
            <div className={styles.resultTie}>
              <span className={styles.resultBestLabel}>
                동률 — {topDates.length}개 날짜 ({maxCount}명)
              </span>
              <ul className={styles.resultTieList}>
                {topDates.map((date) => (
                  <li key={date} className={styles.resultTieItem}>
                    {formatDate(date)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className={styles.resultAllWrap}>
            <p className={styles.resultAllTitle}>전체 날짜별 인원</p>
            <ul className={styles.resultAllList}>
              {entries
                .sort(([, a], [, b]) => Number(b) - Number(a))
                .map(([date, count]) => (
                  <li key={date} className={styles.resultAllItem}>
                    <span>{formatDate(date)}</span>
                    <span className={styles.resultAllCount}>{count}명</span>
                  </li>
                ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
