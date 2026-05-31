import { useState, useEffect, useRef } from 'react';
import useChatStore from '../../stores/useChatStore.js';
import useAuthStore from '../../stores/useAuthStore.js';
import styles from './ChatPanel.module.css';

export default function ChatPanel({ roomId, sendMessage }) {
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  const { messages, isConnected } = useChatStore();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    sendMessage(text);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* 날짜 구분선 */
  let lastDate = '';
  const grouped = messages.map((msg) => {
    const date = msg.sentAt?.slice(0, 10) ?? '';
    const showDivider = date !== lastDate;
    if (showDivider) lastDate = date;
    return { ...msg, showDivider };
  });

  return (
    <aside className={styles.panel}>
      <div className={styles.header}>
        채팅
        <span className={`${styles.dot} ${isConnected ? styles.dotOn : styles.dotOff}`} />
      </div>

      <div className={styles.messages}>
        {grouped.map((msg) => {
          const isMine = msg.userId === user?.id;
          return (
            <div key={msg.id}>
              {msg.showDivider && (
                <div className={styles.dateDivider}>
                  <span>{msg.sentAt?.slice(0, 10)}</span>
                </div>
              )}
              <div className={`${styles.msgRow} ${isMine ? styles.msgRowMine : ''}`}>
                {!isMine && (
                  <span className={styles.avatar}>
                    {msg.userName?.[0] ?? '?'}
                  </span>
                )}
                <div className={styles.msgBubble}>
                  {!isMine && (
                    <span className={styles.senderName}>{msg.userName}</span>
                  )}
                  <p className={`${styles.bubble} ${isMine ? styles.bubbleMine : ''}`}>
                    {msg.content}
                  </p>
                  <span className={styles.time}>
                    {msg.sentAt?.slice(11, 16)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className={styles.inputArea}>
        <textarea
          className={styles.input}
          placeholder="메시지 입력..."
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className={styles.sendBtn} onClick={handleSend}>
          전송
        </button>
      </div>
    </aside>
  );
}
