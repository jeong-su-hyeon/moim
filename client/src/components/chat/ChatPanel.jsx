import { useState, useEffect, useRef, useCallback } from 'react';
import useChatStore from '../../stores/useChatStore.js';
import useAuthStore from '../../stores/useAuthStore.js';
import styles from './ChatPanel.module.css';

function normalizeSentAt(sentAt) {
  if (!sentAt) return '';
  if (Array.isArray(sentAt)) {
    const [y, mo, d, h, mi, s = 0] = sentAt;
    return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return sentAt;
}

function formatTime(sentAt) {
  const s = normalizeSentAt(sentAt);
  return s ? s.slice(11, 16) : '';
}

function formatDateLabel(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

function useNow() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function ChatPanel({ roomId, sendMessage, loadMore }) {
  const [input, setInput] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [noMore, setNoMore] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const savedScrollHeight = useRef(0);
  const isPrepending = useRef(false);
  const prevMessageCount = useRef(0);
  const isAtBottomRef = useRef(true);

  const { messages, isConnected } = useChatStore();
  const user = useAuthStore((s) => s.user);
  const now = useNow();

  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const todayLabel = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 (${days[now.getDay()]})`;
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  // 새 메시지 → 하단 스크롤 / prepend → 위치 유지 / 스크롤 위쪽일 땐 안읽음 배지 증가
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const newCount = messages.length - prevMessageCount.current;
    prevMessageCount.current = messages.length;

    if (isPrepending.current) {
      el.scrollTop = el.scrollHeight - savedScrollHeight.current;
      savedScrollHeight.current = 0;
      isPrepending.current = false;
      return;
    }

    const lastMsg = messages[messages.length - 1];
    const isOwnMessage = lastMsg && String(lastMsg.userId) === String(user?.id);

    if (isAtBottomRef.current || isOwnMessage) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      setUnreadCount(0);
    } else if (newCount > 0) {
      setUnreadCount((c) => c + newCount);
    }
  }, [messages, user?.id]);

  const handleScroll = useCallback(async () => {
    const el = scrollRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceFromBottom < 40;
    isAtBottomRef.current = atBottom;
    if (atBottom) setUnreadCount(0);

    if (loadingMore || noMore || !loadMore || el.scrollTop > 0) return;

    setLoadingMore(true);
    savedScrollHeight.current = el.scrollHeight;
    isPrepending.current = true;

    const count = await loadMore();

    setLoadingMore(false);
    if (count === 0) isPrepending.current = false;
    if (count < 50) setNoMore(true);
  }, [loadingMore, noMore, loadMore]);

  useEffect(() => { setNoMore(false); }, [roomId]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setUnreadCount(0);
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || !isConnected) return;
    sendMessage(text);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 먼저 sentAt 정규화
  const normed = messages.map((msg) => {
    const n = normalizeSentAt(msg.sentAt);
    return { msg, _date: n.slice(0, 10), _hhmm: n.slice(11, 16) };
  });

  // prev/next 동시 참조해 새 객체로 생성 — 객체 변이 없음
  const grouped = normed.map(({ msg, _date, _hhmm }, i) => {
    const prev = i > 0 ? normed[i - 1] : null;
    const next = i < normed.length - 1 ? normed[i + 1] : null;

    const showDivider = _date !== '' && (!prev || prev._date !== _date);
    const showProfile = showDivider || !prev ||
      String(prev.msg.userId) !== String(msg.userId) ||
      prev._hhmm !== _hhmm;

    // 다음 메시지가 같은 사람·같은 날·같은 분이면 시간 숨김 → 그룹 마지막만 표시
    const showTime = !next ||
      String(next.msg.userId) !== String(msg.userId) ||
      next._date !== _date ||
      next._hhmm !== _hhmm ||
      _hhmm === '';

    return { ...msg, _date, _hhmm, showDivider, showProfile, showTime };
  });

  return (
    <aside className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>채팅</div>
        <div className={styles.headerRight}>
          <span className={styles.headerDate}>{todayLabel}</span>
          <span className={styles.headerTime}>{currentTime}</span>
          <span className={`${styles.dot} ${isConnected ? styles.dotOn : styles.dotOff}`} />
        </div>
      </div>

      <div className={styles.messagesWrap}>
      <div className={styles.messages} ref={scrollRef} onScroll={handleScroll}>
        {loadingMore && <div className={styles.statusMsg}>이전 메시지 불러오는 중...</div>}
        {noMore && messages.length > 0 && (
          <div className={styles.statusMsg}>대화 내용의 처음입니다.</div>
        )}

        {grouped.map((msg) => {
          const isMine = String(msg.userId) === String(user?.id);
          const initial = msg.userName?.[0]?.toUpperCase() ?? '?';
          const time = formatTime(msg.sentAt);

          return (
            <div key={msg.id}>
              {msg.showDivider && (
                <div className={styles.dateDivider}>
                  <span>{formatDateLabel(msg._date)}</span>
                </div>
              )}

              {isMine ? (
                <div className={styles.rowMine}>
                  {msg.showTime && <div className={styles.timeMine}>{time}</div>}
                  <div className={`${styles.bubble} ${styles.bubbleMine}`}>{msg.content}</div>
                </div>
              ) : (
                <div className={`${styles.rowOther} ${!msg.showProfile ? styles.rowOtherContinued : ''}`}>
                  {msg.showProfile ? (
                    <div className={styles.avatar}>{initial}</div>
                  ) : (
                    <div className={styles.avatarPlaceholder} />
                  )}
                  <div className={styles.otherContent}>
                    {msg.showProfile && (
                      <span className={styles.senderName}>{msg.userName}</span>
                    )}
                    <div className={styles.otherRow}>
                      <div className={`${styles.bubble} ${styles.bubbleOther}`}>{msg.content}</div>
                      {msg.showTime && <div className={styles.timeOther}>{time}</div>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {unreadCount > 0 && (
        <button className={styles.unreadBadge} onClick={scrollToBottom}>
          새 메시지 {unreadCount}개 ↓
        </button>
      )}
      </div>

      <div className={styles.inputArea}>
        <textarea
          className={styles.input}
          placeholder={isConnected ? '메시지 입력...' : '연결 중...'}
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!isConnected}
        />
        <button
          className={styles.sendBtn}
          onClick={handleSend}
          disabled={!input.trim() || !isConnected}
        >
          전송
        </button>
      </div>
    </aside>
  );
}
