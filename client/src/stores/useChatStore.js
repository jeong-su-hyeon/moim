import { create } from 'zustand';

const useChatStore = create((set) => ({
  messages: [],
  isConnected: false,

  setConnected: (connected) => set({ isConnected: connected }),

  /**
   * 메시지 추가 (실시간 수신 / 옵티미스틱)
   * - 실제 서버 메시지 수신 시 같은 userId+content 의 옵티미스틱을 먼저 제거
   * - id 중복 방지
   */
  addMessage: (message) =>
    set((state) => {
      let msgs = state.messages;
      if (!message._optimistic) {
        const idx = msgs.findIndex(
          (m) => m._optimistic
            && String(m.userId) === String(message.userId)
            && m.content === message.content
        );
        if (idx !== -1) msgs = [...msgs.slice(0, idx), ...msgs.slice(idx + 1)];
      }
      if (msgs.some((m) => m.id === message.id)) return { messages: msgs };
      return { messages: [...msgs, message] };
    }),

  /**
   * 히스토리 세팅 — 레이스 컨디션 방지용 merge
   * 히스토리 로드 중 STOMP 로 받은 실시간 메시지 / 옵티미스틱 메시지를 보존
   */
  setMessages: (history) =>
    set((state) => {
      const historyIds = new Set(history.map((m) => m.id));
      const extras = state.messages.filter(
        (m) => !m._optimistic && !historyIds.has(m.id)
      );
      const pending = state.messages.filter((m) => m._optimistic);
      const merged = [...history, ...extras].sort(
        (a, b) => (a.sentAt ?? '').localeCompare(b.sentAt ?? '')
      );
      return { messages: [...merged, ...pending] };
    }),

  prependMessages: (older) =>
    set((state) => {
      const ids = new Set(state.messages.map((m) => m.id));
      return { messages: [...older.filter((m) => !ids.has(m.id)), ...state.messages] };
    }),

  clear: () => set({ messages: [], isConnected: false }),
}));

export default useChatStore;
