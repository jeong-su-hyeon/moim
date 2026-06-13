import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';

// UTC 기준인 toISOString() 대신 로컬 시간 기준 ISO 문자열 생성
function localISOString() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
import useChatStore from '../stores/useChatStore.js';
import useAuthStore from '../stores/useAuthStore.js';
import { getMessages } from '../services/chatService.js';

export default function useWebSocket(roomId, { onScheduleUpdate } = {}) {
  const clientRef = useRef(null);
  const { addMessage, setMessages, prependMessages, setConnected, clear } = useChatStore();
  const accessToken = useAuthStore((s) => s.accessToken);
  const onScheduleUpdateRef = useRef(onScheduleUpdate);
  useEffect(() => { onScheduleUpdateRef.current = onScheduleUpdate; }, [onScheduleUpdate]);

  useEffect(() => {
    if (!roomId || !accessToken) return;

    const brokerURL = `ws://${window.location.host}/ws/native`;

    const client = new Client({
      brokerURL,
      connectHeaders: { Authorization: `Bearer ${accessToken}` },
      reconnectDelay: 5000,

      onConnect: () => {
        setConnected(true);

        // 채팅 구독을 먼저 — 히스토리 로드 사이에 온 실시간 메시지를 놓치지 않기 위해
        client.subscribe(`/topic/room/${roomId}`, (frame) => {
          try { addMessage(JSON.parse(frame.body)); } catch {}
        });

        client.subscribe(`/topic/room/${roomId}/schedule`, (frame) => {
          try { onScheduleUpdateRef.current?.(JSON.parse(frame.body)); } catch {}
        });

        // REST로 히스토리 로드 (DESC → reverse → ASC)
        getMessages(roomId)
          .then((res) => {
            const msgs = (res.data.data ?? []).reverse();
            setMessages(msgs);
          })
          .catch(() => {});
      },

      onDisconnect: () => setConnected(false),
      onStompError: () => setConnected(false),
    });

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
      setConnected(false);
      clear();
    };
  }, [roomId, accessToken]);

  const sendMessage = (content) => {
    if (!clientRef.current?.connected) return;

    // 옵티미스틱 업데이트: STOMP 응답을 기다리지 않고 즉시 화면에 반영
    const user = useAuthStore.getState().user;
    addMessage({
      id: `temp-${Date.now()}`,
      userId: user?.id,
      userName: user?.name,
      content,
      sentAt: localISOString(),
      _optimistic: true,
    });

    clientRef.current.publish({
      destination: `/app/room/${roomId}/message`,
      body: JSON.stringify({ content }),
    });
  };

  const loadMore = async () => {
    const messages = useChatStore.getState().messages;
    const real = messages.filter((m) => !m._optimistic);
    if (real.length === 0) return 0;
    try {
      const res = await getMessages(roomId, real[0].sentAt);
      const older = (res.data.data ?? []).reverse();
      if (older.length > 0) prependMessages(older);
      return older.length;
    } catch {
      return 0;
    }
  };

  return { sendMessage, loadMore };
}
