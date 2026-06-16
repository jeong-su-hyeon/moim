import { useState } from 'react';
import styles from './CategoryModal.module.css';

const CATEGORIES = [
  { value: 'RESTAURANT', label: '식당', emoji: '🍽️' },
  { value: 'CAFE',       label: '카페', emoji: '☕' },
  { value: 'ACTIVITY',   label: '놀거리', emoji: '🎉' },
];

export default function CategoryModal({ placeName, onConfirm, onCancel }) {
  const [selected, setSelected] = useState(null);

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <p className={styles.title}>등록할 장소의 카테고리를 선택해주세요.</p>
        <p className={styles.placeName}>{placeName}</p>
        <div className={styles.btnGroup}>
          {CATEGORIES.map(({ value, label, emoji }) => (
            <button
              key={value}
              className={`${styles.catBtn} ${selected === value ? styles.catBtnActive : ''}`}
              onClick={() => setSelected(value)}
            >
              <span className={styles.catEmoji}>{emoji}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onCancel}>취소</button>
          <button
            className={styles.confirmBtn}
            disabled={!selected}
            onClick={() => onConfirm(selected)}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
