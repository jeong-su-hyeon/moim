import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/useAuthStore.js';
import { getMyRooms } from '../../services/roomService.js';
import styles from './Home.module.css';

const STATUS_LABEL = {
  ACTIVE: '진행 중',
  CONFIRMED: '확정 완료',
  CANCELLED: '취소',
};

const STATUS_FILTERS = [
  { value: 'ALL', label: '전체' },
  { value: 'ACTIVE', label: '진행 중' },
  { value: 'CONFIRMED', label: '확정 완료' },
];

const SORT_OPTIONS = [
  { value: 'recent', label: '최신순' },
  { value: 'participants', label: '인원 많은순' },
];

export default function Home() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('recent');

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    getMyRooms()
      .then((res) => setRooms(res.data.data ?? []))
      .catch((err) => console.error('[getMyRooms]', err.response?.status, err.response?.data))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const [inviteInput, setInviteInput] = useState('');

  const handleJoinByLink = () => {
    const input = inviteInput.trim();
    if (!input) return;
    const uuidMatch = input.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (uuidMatch) {
      navigate(`/room/${uuidMatch[0]}`);
    } else {
      alert('올바른 초대 링크 또는 방 ID를 입력해주세요.');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const visibleRooms = rooms
    .filter((room) => statusFilter === 'ALL' || room.status === statusFilter)
    .sort((a, b) => {
      if (sortBy === 'participants') return b.participantCount - a.participantCount;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.logo}>mo!m</h1>
        <div className={styles.headerRight}>
          {isAuthenticated ? (
            <>
              <span className={styles.userName}>{user?.name}</span>
              <button className={styles.btn} onClick={handleLogout}>로그아웃</button>
            </>
          ) : (
            <>
              <Link className={styles.btn} to="/login">로그인</Link>
              <Link className={`${styles.btn} ${styles.btnPrimary}`} to="/signup">회원가입</Link>
            </>
          )}
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <h2>함께하는 일정, 쉽게 맞추세요</h2>
          <p>캘린더로 가능한 날짜를 공유하고, 지도로 최적의 장소를 찾아보세요.</p>
          {isAuthenticated ? (
            <Link className={styles.ctaBtn} to="/room/new">새 약속방 만들기</Link>
          ) : (
            <Link className={styles.ctaBtn} to="/login">시작하기</Link>
          )}
        </section>

        {isAuthenticated && (
          <section className={styles.joinSection}>
            <p className={styles.joinLabel}>초대 링크로 참가</p>
            <div className={styles.joinRow}>
              <input
                className={styles.joinInput}
                placeholder="초대 링크 또는 방 ID 붙여넣기"
                value={inviteInput}
                onChange={(e) => setInviteInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinByLink()}
              />
              <button className={styles.joinBtn} onClick={handleJoinByLink}>참가</button>
            </div>
          </section>
        )}

        {isAuthenticated && (
          <section className={styles.roomSection}>
            <div className={styles.sectionHeader}>
              <h3>내 약속방</h3>
              <Link className={styles.newRoomLink} to="/room/new">+ 새 방 만들기</Link>
            </div>

            <div className={styles.roomControls}>
              <div className={styles.statusFilters}>
                {STATUS_FILTERS.map(({ value, label }) => (
                  <button
                    key={value}
                    className={`${styles.filterChip} ${statusFilter === value ? styles.filterChipActive : ''}`}
                    onClick={() => setStatusFilter(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <select
                className={styles.sortSelect}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                {SORT_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {loading ? (
              <p className={styles.empty}>불러오는 중...</p>
            ) : rooms.length === 0 ? (
              <p className={styles.empty}>아직 참여한 약속방이 없습니다.</p>
            ) : visibleRooms.length === 0 ? (
              <p className={styles.empty}>조건에 맞는 약속방이 없습니다.</p>
            ) : (
              <ul className={styles.roomList}>
                {visibleRooms.map((room) => (
                  <li key={room.id}>
                    <Link className={styles.roomCard} to={`/room/${room.id}`}>
                      <div className={styles.roomCardLeft}>
                        <div className={styles.roomTitleRow}>
                          <span className={styles.roomTitle}>{room.title}</span>
                          <span className={`${styles.statusBadge} ${styles[`status_${room.status}`]}`}>
                            {STATUS_LABEL[room.status] ?? room.status}
                          </span>
                        </div>
                        <span className={styles.roomMeta}>
                          {room.hostName} 외 {Math.max(room.participantCount - 1, 0)}명
                        </span>
                      </div>
                      <div className={styles.roomCardRight}>
                        <span className={styles.participantBadge}>
                          👥 {room.participantCount}/{room.maxParticipants}명
                        </span>
                        {room.confirmedDate && (
                          <span className={styles.confirmedDateBadge}>
                            📅 {room.confirmedDate}
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
