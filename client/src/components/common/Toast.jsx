import { useEffect, useState } from 'react';
import styles from './Toast.module.css';

/**
 * @param {{ message: string, duration?: number, onClose: () => void }} props
 */
export default function Toast({ message, duration = 2500, onClose }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300); // fade-out 후 제거
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className={`${styles.toast} ${visible ? styles.show : styles.hide}`}>
      {message}
    </div>
  );
}
