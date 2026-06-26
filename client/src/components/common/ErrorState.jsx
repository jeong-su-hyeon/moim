import { Link } from 'react-router-dom';
import styles from './ErrorState.module.css';

const PRESETS = {
  notFound: { icon: '🔍', title: '페이지를 찾을 수 없습니다', message: '요청하신 페이지가 존재하지 않거나 이동되었습니다.' },
  roomExpired: { icon: '⏳', title: '약속방이 만료되었습니다', message: '이 약속방은 자동 파기되어 더 이상 접근할 수 없습니다.' },
  roomNotFound: { icon: '🚪', title: '약속방을 찾을 수 없습니다', message: '존재하지 않거나 삭제된 약속방입니다.' },
  generic: { icon: '⚠️', title: '문제가 발생했습니다', message: '잠시 후 다시 시도해주세요.' },
};

export default function ErrorState({ type = 'generic', title, message, actionLabel = '홈으로 돌아가기', actionTo = '/', fullPage = true }) {
  const preset = PRESETS[type] ?? PRESETS.generic;
  return (
    <div className={fullPage ? styles.fullPage : styles.inline}>
      <span className={styles.icon}>{preset.icon}</span>
      <h2 className={styles.title}>{title ?? preset.title}</h2>
      <p className={styles.message}>{message ?? preset.message}</p>
      <Link className={styles.actionBtn} to={actionTo}>{actionLabel}</Link>
    </div>
  );
}
