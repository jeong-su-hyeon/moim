import { useState } from 'react';
import { TABS } from '../../constants/index.js';
import CalendarView from '../calendar/CalendarView.jsx';
import MapView from '../map/MapView.jsx';
import ChatPanel from '../chat/ChatPanel.jsx';
import styles from './RoomLayout.module.css';

const NAV_ITEMS = [
  { tab: TABS.DATE, label: '날짜\n선택', icon: '📅' },
  { tab: TABS.PLACE, label: '장소\n선택', icon: '📍' },
  { tab: TABS.RESULT, label: '최종\n약속', icon: '✅' },
];

export default function RoomLayout({ room }) {
  const [activeTab, setActiveTab] = useState(TABS.DATE);

  return (
    <div className={styles.layout}>
      {/* 왼쪽 세로 네비게이션 */}
      <nav className={styles.nav}>
        <div className={styles.navTitle}>
          <span className={styles.navTitleText}>{room?.title ?? '모임'}</span>
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
      </nav>

      {/* 메인 콘텐츠 */}
      <main className={styles.main}>
        {activeTab === TABS.DATE && <CalendarView roomId={room?.id} />}
        {activeTab === TABS.PLACE && <MapView roomId={room?.id} />}
        {activeTab === TABS.RESULT && <ResultView room={room} />}
      </main>

      {/* 오른쪽 채팅 패널 */}
      <ChatPanel roomId={room?.id} />
    </div>
  );
}

function ResultView({ room }) {
  return (
    <div style={{ padding: '24px' }}>
      <h2>최종 약속 정보</h2>
      {room?.confirmedDate ? (
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p>
            <strong>날짜:</strong> {room.confirmedDate}
          </p>
          <p>
            <strong>장소:</strong> {room.confirmedPlace?.name ?? '미정'}
          </p>
        </div>
      ) : (
        <p style={{ marginTop: '16px', color: '#888' }}>아직 확정된 약속이 없습니다.</p>
      )}
    </div>
  );
}
