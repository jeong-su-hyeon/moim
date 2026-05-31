import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/useAuthStore.js';
import { getMyRooms } from '../../services/roomService.js';
import styles from './Home.module.css';

const STATUS_LABEL = {
  ACTIVE: '진행 중',
  CONFIRMED: '확정',
  CANCELLED: '취소',
};

export default function Home() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);

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
    // UUID 또는 전체 URL 모두 허용
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

  return (
    <div className={styles.page}>
      {/* 헤더 */}
      <header className={styles.header}>
        <h1 className={styles.logo}>모임</h1>
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
        {/* 히어로 */}
        <section className={styles.hero}>
          <h2>함께하는 일정, 쉽게 맞추세요</h2>
          <p>캘린더로 가능한 날짜를 공유하고, 지도로 최적의 장소를 찾아보세요.</p>
          {isAuthenticated ? (
            <Link className={styles.ctaBtn} to="/room/new">새 약속방 만들기</Link>
          ) : (
            <Link className={styles.ctaBtn} to="/login">시작하기</Link>
          )}
        </section>

        {/* 초대 링크로 참가 */}
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
              <button className={styles.joinBtn} onClick={handleJoinByLink}>
                참가
              </button>
            </div>
          </section>
        )}

        {/* 내 약속방 목록 */}
        {isAuthenticated && (
          <section className={styles.roomSection}>
            <div className={styles.sectionHeader}>
              <h3>내 약속방</h3>
              <Link className={styles.newRoomLink} to="/room/new">+ 새 방 만들기</Link>
            </div>

            {loading ? (
              <p className={styles.empty}>불러오는 중...</p>
            ) : rooms.length === 0 ? (
              <p className={styles.empty}>아직 참여한 약속방이 없습니다.</p>
            ) : (
              <ul className={styles.roomList}>
                {rooms.map((room) => (
                  <li key={room.id}>
                    <Link className={styles.roomCard} to={`/room/${room.id}`}>
                      <div className={styles.roomCardLeft}>
                        <span className={styles.roomTitle}>{room.title}</span>
                        <span className={styles.roomMeta}>
                          방장: {room.hostName} · {room.participantCount}명 참여
                          {room.confirmedDate && ` · ${room.confirmedDate}`}
                        </span>
                      </div>
                      <span className={`${styles.statusBadge} ${styles[`status_${room.status}`]}`}>
                        {STATUS_LABEL[room.status] ?? room.status}
                      </span>
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
