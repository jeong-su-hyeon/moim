import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/useAuthStore.js';
import api from '../../services/api.js';
import styles from './Home.module.css';

export default function Home() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    if (!isAuthenticated) return;
    api.get('/rooms').then((res) => setRooms(res.data.data ?? [])).catch(() => {});
  }, [isAuthenticated]);

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

        {/* 내 약속방 목록 */}
        {isAuthenticated && (
          <section className={styles.roomSection}>
            <div className={styles.sectionHeader}>
              <h3>내 약속방</h3>
              <Link className={styles.newRoomLink} to="/room/new">+ 새 방 만들기</Link>
            </div>

            {rooms.length === 0 ? (
              <p className={styles.empty}>아직 참여한 약속방이 없습니다.</p>
            ) : (
              <ul className={styles.roomList}>
                {rooms.map((room) => (
                  <li key={room.id}>
                    <Link className={styles.roomCard} to={`/room/${room.id}`}>
                      <span className={styles.roomTitle}>{room.title}</span>
                      <span className={styles.roomMeta}>
                        {room.participants?.length ?? 0}명 참여 · {room.status}
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
