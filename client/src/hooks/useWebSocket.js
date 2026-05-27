import { useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";
import useChatStore from "../stores/useChatStore.js";
import useAuthStore from "../stores/useAuthStore.js";

/**
 * STOMP over native WebSocket 연결 훅 (SockJS 미사용)
 * 개발 환경에서는 Vite 프록시(/ws → localhost:8000)를 경유
 * @param {string} roomId
 */
export default function useWebSocket(roomId) {
  const clientRef = useRef(null);
  const { addMessage, setConnected } = useChatStore();
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!roomId || !accessToken) return;

    // ws://localhost:3000/ws/native → Vite 프록시 → ws://localhost:8000/ws/native
    const brokerURL = `ws://${window.location.host}/ws/native`;

    const client = new Client({
      brokerURL,
      connectHeaders: { Authorization: `Bearer ${accessToken}` },
      reconnectDelay: 5000,
      onConnect: () => {
        setConnected(true);
        client.subscribe(`/topic/room/${roomId}`, (frame) => {
          try {
            addMessage(JSON.parse(frame.body));
          } catch {
            // 잘못된 메시지 무시
          }
        });
      },
      onDisconnect: () => setConnected(false),
      onStompError: () => setConnected(false),
    });

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
      setConnected(false);
    };
  }, [roomId, accessToken]);

  const sendMessage = (content) => {
    if (!clientRef.current?.connected) return;
    clientRef.current.publish({
      destination: `/app/room/${roomId}/message`,
      body: JSON.stringify({ content }),
    });
  };

  return { sendMessage };
}
