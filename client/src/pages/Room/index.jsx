import { useParams, Link } from "react-router-dom";
import useRoom from "../../hooks/useRoom.js";
import useRoomStore from "../../stores/useRoomStore.js";
import RoomLayout from "../../components/room/RoomLayout.jsx";
import styles from "./Room.module.css";

export default function Room() {
  const { roomId } = useParams();
  useRoom(roomId);
  const room = useRoomStore((s) => s.room);

  // room이 다른 방 데이터거나 아직 미로드
  if (!room || room.id !== roomId) {
    return <div className={styles.loading}>방 정보를 불러오는 중...</div>;
  }

  return <RoomLayout room={room} />;
}
