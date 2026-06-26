import { useEffect, useState } from "react";
import { getRoom } from "../services/roomService.js";
import { getAggregatedSchedules, getMySchedules } from "../services/scheduleService.js";
import useRoomStore from "../stores/useRoomStore.js";
import useScheduleStore from "../stores/useScheduleStore.js";

export default function useRoom(roomId) {
  const { setRoom, setParticipants } = useRoomStore();
  const { setAggregated, setMyDates } = useScheduleStore();
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!roomId) return;
    setError(null);

    (async () => {
      // 방 정보·집계일정·내 일정을 병렬로 요청
      const [roomRes, aggRes, myRes] = await Promise.allSettled([
        getRoom(roomId),
        getAggregatedSchedules(roomId),
        getMySchedules(roomId),
      ]);

      // 방 정보 실패 → 에러 상태로 전환 (호출부에서 404/만료 화면 표시)
      if (roomRes.status === 'rejected') {
        const code = roomRes.reason?.response?.data?.error?.code;
        setError(code ?? 'ROOM_NOT_FOUND');
        return;
      }

      const roomData = roomRes.value.data.data;

      // 모든 store를 한 번에 업데이트한 뒤 room을 set → 렌더링 시 데이터 즉시 반영
      if (aggRes.status === 'fulfilled') {
        setAggregated(aggRes.value.data.data ?? {});
      }
      if (myRes.status === 'fulfilled') {
        const dates = (myRes.value.data.data ?? []).map((d) => String(d));
        setMyDates(roomId, dates);
      }

      setRoom(roomData);
      setParticipants(roomData.participants ?? []);
    })();
  }, [roomId]);

  return { error };
}
