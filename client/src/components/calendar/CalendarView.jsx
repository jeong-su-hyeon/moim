import { useState } from 'react';
import useScheduleStore from '../../stores/useScheduleStore.js';
import useRoomStore from '../../stores/useRoomStore.js';
import { toDateString, firstDayOf, lastDayOf, WEEKDAYS } from '../../utils/dateUtils.js';
import styles from './CalendarView.module.css';

export default function CalendarView({ roomId }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed

  const { myDates, aggregated, toggleDate } = useScheduleStore();
  const { participants } = useRoomStore();

  const firstDay = firstDayOf(year, month);
  const totalDays = lastDayOf(year, month);
  const startWeekday = firstDay.getDay(); // 0=일

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  /* 날짜별 가능 인원 수 맵 */
  const countMap = {};
  (aggregated ?? []).forEach(({ availableDate, count }) => {
    countMap[availableDate] = count;
  });

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  return (
    <div className={styles.wrap}>
      {/* 헤더 */}
      <div className={styles.header}>
        <button className={styles.navBtn} onClick={prevMonth}>{'<'}</button>
        <span className={styles.monthLabel}>{year}년 {month + 1}월</span>
        <button className={styles.navBtn} onClick={nextMonth}>{'>'}</button>
      </div>

      {/* 참여자 범례 */}
      {participants.length > 0 && (
        <div className={styles.legend}>
          {participants.map((p) => (
            <span key={p.id} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: participantColor(p.id) }} />
              {p.name}
            </span>
          ))}
        </div>
      )}

      {/* 요일 행 */}
      <div className={styles.grid}>
        {WEEKDAYS.map((w) => (
          <div key={w} className={styles.weekday}>{w}</div>
        ))}

        {/* 날짜 셀 */}
        {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} />;
          const dateStr = toDateString(new Date(year, month, day));
          const isSelected = myDates.includes(dateStr);
          const count = countMap[dateStr] ?? 0;
          const total = participants.length || 1;
          const ratio = count / total;

          return (
            <button
              key={dateStr}
              className={`${styles.cell} ${isSelected ? styles.cellSelected : ''}`}
              onClick={() => toggleDate(dateStr)}
            >
              <span className={styles.dayNum}>{day}</span>
              {count > 0 && (
                <span className={styles.countBadge} style={{ opacity: 0.4 + ratio * 0.6 }}>
                  {count}명
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 내 날짜 저장 버튼 */}
      <div className={styles.footer}>
        <span className={styles.selectedInfo}>
          {myDates.length}일 선택됨
        </span>
        <button className={styles.saveBtn} onClick={() => alert('저장 기능은 서버 연동 후 동작합니다.')}>
          저장
        </button>
      </div>
    </div>
  );
}

const COLORS = ['#e53935', '#fb8c00', '#43a047', '#1e88e5', '#8e24aa', '#00acc1'];
const participantColor = (id) => COLORS[parseInt(id, 36) % COLORS.length] ?? '#999';
