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
import useAuthStore from '../../stores/useAuthStore.js';
import { getAggregatedSchedules } from '../../services/scheduleService.js';
import { confirmRoom, unconfirmRoom } from '../../services/roomService.js';
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

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    if (tab === TABS.RESULT) {
      getAggregatedSchedules(room?.id)
        .then((r) => setAggregated(r.data.data ?? {}))
        .catch(() => {});
    }
  }, [room?.id, setAggregated]);

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
                onClick={() => handleTabChange(tab)}
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
  const { participants, setRoom } = useRoomStore();
  const { user } = useAuthStore();
  const isHost = room?.hostId === user?.id;
  const isConfirmed = !!room?.confirmedDate;
  const totalCount = participants.length || 0;
  const [selectedDate, setSelectedDate] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [unconfirming, setUnconfirming] = useState(false);
  const [toast, setToast] = useState(null);

  // aggregated: { "2026-06-01": ["김철수", "이영희"], ... }
  const entries = Object.entries(aggregated ?? {});
  const getNames = (val) => (Array.isArray(val) ? val : []);
  const getCount = (val) => getNames(val).length;

  let topDate = null;
  let maxCount = 0;

  if (entries.length > 0) {
    maxCount = Math.max(...entries.map(([, v]) => getCount(v)));
    topDate = entries
      .filter(([, v]) => getCount(v) === maxCount)
      .map(([date]) => date)
      .sort()[0];
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    return `${dateStr} (${weekdays[d.getDay()]})`;
  };

  const sortedEntries = [...entries].sort(([a], [b]) => a.localeCompare(b));

  const handleConfirm = async () => {
    if (!selectedDate) return;
    setConfirming(true);
    try {
      const res = await confirmRoom(room.id, selectedDate);
      setRoom(res.data.data);
      setSelectedDate(null);
    } catch (err) {
      const code = err.response?.data?.error?.code;
      if (code === 'FORBIDDEN') setToast('방장만 날짜를 확정할 수 있습니다.');
      else setToast('확정에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setConfirming(false);
    }
  };

  const handleUnconfirm = async () => {
    setUnconfirming(true);
    try {
      const res = await unconfirmRoom(room.id);
      setRoom(res.data.data);
    } catch {
      setToast('확정 취소에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setUnconfirming(false);
    }
  };

  const showSelectUI = isHost && !isConfirmed;

  return (
    <div className={styles.resultWrap}>
      <h2 className={styles.resultTitle}>최종 약속 날짜</h2>

      {entries.length === 0 ? (
        <p className={styles.resultEmpty}>아직 일정을 입력한 참여자가 없습니다.</p>
      ) : (
        <>
          {topDate && (
            <div className={`${styles.resultBest} ${selectedDate === topDate ? styles.resultBestSelected : ''}`}>
              <span className={styles.resultBestLabel}>최다 선택 날짜</span>
              <p className={styles.resultBestDate}>{formatDate(topDate)}</p>
              <p className={styles.resultBestCount}>
                {totalCount > 0
                  ? `${totalCount}명 중 ${maxCount}명 가능`
                  : `${maxCount}명 가능`}
              </p>
              <p className={styles.resultNames}>{getNames(aggregated[topDate]).join(', ')}</p>
            </div>
          )}

          <div className={styles.resultAllWrap}>
            <p className={styles.resultAllTitle}>날짜 후보</p>
            <ul className={styles.resultAllList}>
              {sortedEntries.map(([date, val]) => {
                const isConfirmedDate = isConfirmed && date === String(room.confirmedDate);
                const Row = showSelectUI ? 'label' : 'div';
                return (
                <li key={date}>
                  <Row
                    className={[
                      styles.resultAllItem,
                      showSelectUI ? styles.resultAllItemClickable : '',
                      selectedDate === date ? styles.resultAllItemSelected : '',
                      isConfirmedDate ? styles.resultAllItemConfirmed : '',
                    ].join(' ')}
                  >
                    {showSelectUI && (
                      <input
                        type="radio"
                        name="confirmedDate"
                        value={date}
                        checked={selectedDate === date}
                        onChange={() => setSelectedDate(date)}
                        className={styles.resultRadio}
                      />
                    )}
                    <span className={styles.resultAllDate}>{formatDate(date)}</span>
                    <span className={styles.resultAllRight}>
                      <span className={styles.resultAllNames}>{getNames(val).join(', ')}</span>
                      <span className={styles.resultAllCount}>{getCount(val)}명</span>
                      {isConfirmedDate && <span className={styles.confirmedBadge}>확정</span>}
                    </span>
                  </Row>
                </li>
                );
              })}
            </ul>
          </div>

          {showSelectUI && (
            <button
              className={styles.resultConfirmBtn}
              disabled={!selectedDate || confirming}
              onClick={handleConfirm}
            >
              {confirming ? '처리 중...' : '확정 날짜 선택하기'}
            </button>
          )}

          {isHost && isConfirmed && (
            <button
              className={styles.unconfirmBtn}
              disabled={unconfirming}
              onClick={handleUnconfirm}
            >
              {unconfirming ? '처리 중...' : '확정 날짜 취소'}
            </button>
          )}
        </>
      )}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
