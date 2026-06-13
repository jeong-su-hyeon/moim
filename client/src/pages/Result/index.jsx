import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../../services/api.js';
import useAuthStore from '../../stores/useAuthStore.js';
import { confirmRoom } from '../../services/roomService.js';
import { getAggregatedSchedules } from '../../services/scheduleService.js';
import styles from './Result.module.css';

export default function Result() {
  const { roomId } = useParams();
  const [result, setResult] = useState(null);
  const [showTimeVote, setShowTimeVote] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [aggregated, setAggregated] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useState(null);
  const { user } = useAuthStore();

  const fetchResult = () => {
    api.get(`/rooms/${roomId}/result`)
      .then((res) => setResult(res.data.data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchResult();
  }, [roomId]);

  const isHost = result?.hostId && user?.id && result.hostId === user.id;

  const handleEditClick = () => {
    getAggregatedSchedules(roomId)
      .then((r) => setAggregated(r.data.data ?? {}))
      .catch(() => {});
    setSelectedDate(result?.confirmedDate ?? null);
    setEditMode(true);
  };

  const handleConfirm = async () => {
    if (!selectedDate) return;
    setConfirming(true);
    try {
      await confirmRoom(roomId, selectedDate);
      setEditMode(false);
      fetchResult();
    } catch {
      setToast('날짜 수정에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setConfirming(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '미정';
    const d = new Date(dateStr + 'T00:00:00');
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    return `${dateStr} (${weekdays[d.getDay()]})`;
  };

  const aggregatedEntries = Object.entries(aggregated).sort(
    ([, a], [, b]) => (Array.isArray(b) ? b.length : 0) - (Array.isArray(a) ? a.length : 0)
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to={`/room/${roomId}`} className={styles.backLink}>← 약속방으로</Link>
        <h2 className={styles.title}>최종 약속 정보</h2>
      </header>

      {toast && (
        <div className={styles.toastBanner}>{toast}</div>
      )}

      <main className={styles.main}>
        {!result ? (
          <p className={styles.empty}>아직 확정된 약속이 없습니다.</p>
        ) : (
          <>
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>날짜</h3>
                {isHost && !editMode && (
                  <button className={styles.editBtn} onClick={handleEditClick}>수정</button>
                )}
              </div>
              {editMode ? (
                <div className={styles.editArea}>
                  <ul className={styles.dateList}>
                    {aggregatedEntries.map(([date, val]) => {
                      const names = Array.isArray(val) ? val : [];
                      return (
                        <li key={date}>
                          <label className={`${styles.dateItem} ${selectedDate === date ? styles.dateItemSelected : ''}`}>
                            <input
                              type="radio"
                              name="editDate"
                              value={date}
                              checked={selectedDate === date}
                              onChange={() => setSelectedDate(date)}
                              className={styles.dateRadio}
                            />
                            <span className={styles.dateLabel}>{formatDate(date)}</span>
                            <span className={styles.dateCount}>{names.length}명</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                  <div className={styles.editActions}>
                    <button className={styles.cancelBtn} onClick={() => setEditMode(false)}>취소</button>
                    <button
                      className={styles.confirmBtn}
                      disabled={!selectedDate || confirming}
                      onClick={handleConfirm}
                    >
                      {confirming ? '처리 중...' : '확정'}
                    </button>
                  </div>
                </div>
              ) : (
                <p className={styles.cardValue}>{formatDate(result.confirmedDate)}</p>
              )}
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
