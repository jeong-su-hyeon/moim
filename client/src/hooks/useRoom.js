import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getRoom } from "../services/roomService.js";
import { getAggregatedSchedules, getMySchedules } from "../services/scheduleService.js";
import useRoomStore from "../stores/useRoomStore.js";
import useScheduleStore from "../stores/useScheduleStore.js";

/**
 * 방 진입 시 데이터를 로드하는 훅
 * - 스토어에 이미 동일 roomId의 room이 있으면 API 호출 건너뜀 (mock 방 포함)
 * - 부차적 데이터(일정·채팅) 실패는 무시 (방 정보만 필수)
 */
export default function useRoom(roomId) {
  const navigate = useNavigate();
  const { setRoom } = useRoomStore();
  const { setAggregated, setMyDates } = useScheduleStore();

  useEffect(() => {
    if (!roomId) return;

    (async () => {
      try {
        const roomRes = await getRoom(roomId);
        setRoom(roomRes.data.data);
      } catch (err) {
        // 404 포함 모든 에러 → 홈으로 이동 (에러 무시 시 로딩 화면에 영구 고착)
        navigate("/");
        return;
      }

      // 부차적 데이터 — 실패해도 방 화면은 계속 표시
      getAggregatedSchedules(roomId)
        .then((r) => setAggregated(r.data.data ?? {}))
        .catch(() => {});

      getMySchedules(roomId)
        .then((r) => {
          const dates = (r.data.data ?? []).map((d) => String(d));
          setMyDates(roomId, dates);
        })
        .catch(() => {});

    })();
  }, [roomId]);
}
