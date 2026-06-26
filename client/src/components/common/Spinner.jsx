import styles from './Spinner.module.css';

export default function Spinner({ label = '불러오는 중...', fullPage = false, size = 'md' }) {
  const wrapClass = fullPage ? styles.fullPage : styles.inline;
  return (
    <div className={wrapClass}>
      <span className={`${styles.spinner} ${styles[size]}`} />
      {label && <p className={styles.label}>{label}</p>}
    </div>
  );
}
