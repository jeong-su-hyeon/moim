import { useState } from 'react';
import useScheduleStore from '../../stores/useScheduleStore.js';
import useRoomStore from '../../stores/useRoomStore.js';
import { saveMyDates } from '../../services/scheduleService.js';
import Toast from '../common/Toast.jsx';
import { toDateString, firstDayOf, lastDayOf, WEEKDAYS } from '../../utils/dateUtils.js';
import styles from './CalendarView.module.css';

export default function CalendarView({ roomId }) {
  const today = new Date();
  const todayStr = toDateString(today);

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const { getMyDates, toggleDate, clearDates, aggregated } = useScheduleStore();
  const { participants } = useRoomStore();

  const myDates = getMyDates(roomId);

  const handleSave = async () => {
    if (myDates.length === 0) return;
    setSaving(true);
    try {
      await saveMyDates(roomId, myDates);
      setToast('일정이 저장되었습니다.');
    } catch {
      setToast('저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  const firstDay = firstDayOf(year, month);
  const totalDays = lastDayOf(year, month);
  const startWeekday = firstDay.getDay();

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const countMap = aggregated && typeof aggregated === 'object' && !Array.isArray(aggregated)
    ? aggregated
    : {};

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <button className={styles.navBtn} onClick={prevMonth}>{'<'}</button>
        <span className={styles.monthLabel}>{year}년 {month + 1}월</span>
        <button className={styles.navBtn} onClick={nextMonth}>{'>'}</button>
      </div>

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

      <div className={styles.grid}>
        {WEEKDAYS.map((w) => (
          <div key={w} className={styles.weekday}>{w}</div>
        ))}

        {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} />;
          const dateStr = toDateString(new Date(year, month, day));
          const isPast = dateStr < todayStr; // 오늘 미포함, 어제까지 비활성화
          const isSelected = myDates.includes(dateStr);
          const names = countMap[dateStr] ?? [];
          const count = Array.isArray(names) ? names.length : Number(names);
          const total = participants.length || 1;
          const ratio = count / total;

          return (
            <button
              key={dateStr}
              className={[
                styles.cell,
                isSelected ? styles.cellSelected : '',
                isPast ? styles.cellPast : '',
              ].join(' ')}
              onClick={() => !isPast && toggleDate(roomId, dateStr)}
              disabled={isPast}
            >
              <span className={styles.dayNum}>{day}</span>
              {count > 0 && !isPast && (
                <span className={styles.countBadge} style={{ opacity: 0.4 + ratio * 0.6 }}>
                  {count}명
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className={styles.footer}>
        <span className={styles.selectedInfo}>{myDates.length}일 선택됨</span>
        <div className={styles.footerBtns}>
          <button
            className={styles.clearBtn}
            onClick={() => clearDates(roomId)}
            disabled={myDates.length === 0}
          >
            초기화
          </button>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={saving || myDates.length === 0}
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

const COLORS = ['#e53935', '#fb8c00', '#43a047', '#1e88e5', '#8e24aa', '#00acc1'];
const participantColor = (id) => COLORS[parseInt(id, 36) % COLORS.length] ?? '#999';
