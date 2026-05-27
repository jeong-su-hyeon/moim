import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../../services/api.js';
import styles from './Result.module.css';

export default function Result() {
  const { roomId } = useParams();
  const [result, setResult] = useState(null);
  const [showTimeVote, setShowTimeVote] = useState(false);

  useEffect(() => {
    api.get(`/rooms/${roomId}/result`)
      .then((res) => setResult(res.data.data))
      .catch(() => {});
  }, [roomId]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to={`/room/${roomId}`} className={styles.backLink}>← 약속방으로</Link>
        <h2 className={styles.title}>최종 약속 정보</h2>
      </header>

      <main className={styles.main}>
        {!result ? (
          <p className={styles.empty}>아직 확정된 약속이 없습니다.</p>
        ) : (
          <>
            <section className={styles.card}>
              <h3 className={styles.cardTitle}>날짜</h3>
              <p className={styles.cardValue}>{result.confirmedDate ?? '미정'}</p>
            </section>

            <section className={styles.card}>
              <h3 className={styles.cardTitle}>장소</h3>
              <p className={styles.cardValue}>{result.confirmedPlace?.name ?? '미정'}</p>
              {result.confirmedPlace?.address && (
                <p className={styles.cardSub}>{result.confirmedPlace.address}</p>
              )}
            </section>

            <section className={styles.card}>
              <h3 className={styles.cardTitle}>참여자</h3>
              <ul className={styles.participantList}>
                {(result.participants ?? []).map((p) => (
                  <li key={p.id}>{p.name}</li>
                ))}
              </ul>
            </section>

            {/* 시간 투표 (선택 기능) */}
            <section className={styles.card}>
              <div className={styles.timeVoteHeader}>
                <h3 className={styles.cardTitle}>시간 투표</h3>
                <button
                  className={styles.toggleBtn}
                  onClick={() => setShowTimeVote((v) => !v)}
                >
                  {showTimeVote ? '닫기' : '시간도 정하기'}
                </button>
              </div>
              {showTimeVote && (
                <div className={styles.timeVoteArea}>
                  <p className={styles.cardSub}>원하는 시간대를 선택하세요.</p>
                  {['오전 (9~12시)', '점심 (12~14시)', '오후 (14~18시)', '저녁 (18~21시)'].map((slot) => (
                    <button key={slot} className={styles.slotBtn}
                      onClick={() => alert('시간 투표는 서버 연동 후 동작합니다.')}>
                      {slot}
                    </button>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
