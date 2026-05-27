import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getRoom } from "../services/roomService.js";
import { getAggregatedSchedules } from "../services/scheduleService.js";
import { getMessages } from "../services/chatService.js";
import useRoomStore from "../stores/useRoomStore.js";
import useScheduleStore from "../stores/useScheduleStore.js";
import useChatStore from "../stores/useChatStore.js";

/**
 * 방 진입 시 데이터를 로드하는 훅
 * - 스토어에 이미 동일 roomId의 room이 있으면 API 호출 건너뜀 (mock 방 포함)
 * - 부차적 데이터(일정·채팅) 실패는 무시 (방 정보만 필수)
 */
export default function useRoom(roomId) {
  const navigate = useNavigate();
  const { room, setRoom } = useRoomStore();
  const { setAggregated } = useScheduleStore();
  const { setMessages } = useChatStore();

  useEffect(() => {
    if (!roomId) return;
    // 스토어에 이미 이 방 데이터가 있으면 건너뜀 (mock 방 or 재진입)
    if (room?.id === roomId) return;

    (async () => {
      try {
        const roomRes = await getRoom(roomId);
        setRoom(roomRes.data.data);
      } catch (err) {
        if (err.response?.status === 404) {
          navigate("/");
        }
        // 서버 미연결 등 그 외 에러 → 이미 스토어에 mock 방이 있을 수 있으므로 무시
        return;
      }

      // 부차적 데이터 — 실패해도 방 화면은 계속 표시
      getAggregatedSchedules(roomId)
        .then((r) => setAggregated(r.data.data ?? []))
        .catch(() => {});

      getMessages(roomId)
        .then((r) => setMessages(r.data.data ?? []))
        .catch(() => {});
    })();
  }, [roomId]);
}
