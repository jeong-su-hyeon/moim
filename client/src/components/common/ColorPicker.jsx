import { PARTICIPANT_COLORS } from '../../constants/index.js';
import styles from './ColorPicker.module.css';

/**
 * @param {{ value: string|null, onChange: (key: string) => void, disabledColors?: string[] }} props
 */
export default function ColorPicker({ value, onChange, disabledColors = [] }) {
  return (
    <div className={styles.grid}>
      {PARTICIPANT_COLORS.map(({ key, hex, label }) => {
        const isSelected = value === key;
        const isDisabled = disabledColors.includes(key);
        return (
          <button
            key={key}
            type="button"
            className={`${styles.swatch} ${isDisabled ? styles.swatchDisabled : ''}`}
            style={{ backgroundColor: hex }}
            title={isDisabled ? `${label} (선택됨)` : label}
            aria-label={label}
            aria-pressed={isSelected}
            disabled={isDisabled}
            onClick={() => {
              if (isDisabled) return;
              onChange(key);
            }}
          >
            {isSelected && <span className={styles.check}>✓</span>}
          </button>
        );
      })}
    </div>
  );
}
