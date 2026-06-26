import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useRoom from '../../hooks/useRoom.js';
import useRoomStore from '../../stores/useRoomStore.js';
import useAuthStore from '../../stores/useAuthStore.js';
import { joinRoom, getRoom } from '../../services/roomService.js';
import RoomLayout from '../../components/room/RoomLayout.jsx';
import ColorPicker from '../../components/common/ColorPicker.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import styles from './Room.module.css';

const ROOM_ERROR_TYPE = {
  ROOM_EXPIRED: 'roomExpired',
  ROOM_NOT_FOUND: 'roomNotFound',
};

export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { error: roomError } = useRoom(roomId);

  const room = useRoomStore((s) => s.room);
  const { user, isAuthenticated } = useAuthStore();
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(null);
  const [color, setColor] = useState(null);

  if (roomError) {
    return <ErrorState type={ROOM_ERROR_TYPE[roomError] ?? 'roomNotFound'} />;
  }

  if (!room || room.id !== roomId) {
    return <Spinner fullPage label="방 정보를 불러오는 중..." />;
  }

  // 현재 유저가 참여자인지 확인
  const isParticipant = isAuthenticated && room.participants?.some((p) => p.id === user?.id);

  if (!isParticipant) {
    const handleJoin = async () => {
      if (!isAuthenticated) {
        navigate(`/login?redirect=/room/${roomId}`);
        return;
      }
      if (!color) return;
      setJoining(true);
      setError(null);
      try {
        await joinRoom(roomId, color);
        // 참가 완료 후 최신 방 데이터(참여자 포함)로 스토어 직접 갱신
        const roomRes = await getRoom(roomId);
        const roomData = roomRes.data.data;
        useRoomStore.getState().setRoom(roomData);
        useRoomStore.getState().setParticipants(roomData.participants ?? []);
      } catch (err) {
        const code = err.response?.data?.error?.code;
        if (code === 'ROOM_FULL') setError(`방 인원이 가득 찼습니다. (최대 ${room?.maxParticipants ?? 10}명)`);
        else if (code === 'ROOM_ALREADY_JOINED') setError('이미 참여 중인 방입니다.');
        else if (code === 'COLOR_ALREADY_TAKEN') {
          setError('다른 참여자가 먼저 선택한 색상입니다. 다른 색상을 선택해주세요.');
          setColor(null);
          getRoom(roomId)
            .then((res) => useRoomStore.getState().setRoom(res.data.data))
            .catch(() => {});
        } else setError('참가에 실패했습니다. 다시 시도해주세요.');
      } finally {
        setJoining(false);
      }
    };

    return (
      <div className={styles.joinPage}>
        <div className={styles.joinCard}>
          <p className={styles.joinLabel}>약속방 초대</p>
          <h2 className={styles.joinTitle}>{room.title}</h2>
          <p className={styles.joinMeta}>
            방장: {room.hostName} · {room.participantCount} / {room.maxParticipants ?? 10}명 참여 중
          </p>
          <div className={styles.joinColorSection}>
            <p className={styles.joinColorLabel}>내 색상 선택</p>
            <ColorPicker
              value={color}
              onChange={setColor}
              disabledColors={(room.participants ?? []).map((p) => p.color)}
            />
          </div>
          {error && <p className={styles.joinError}>{error}</p>}
          <div className={styles.joinActions}>
            <button className={styles.joinBtn} onClick={handleJoin} disabled={joining || !color}>
              {joining ? '참가 중...' : '이 방에 참가하기'}
            </button>
            <button className={styles.cancelBtn} onClick={() => navigate('/')}>
              돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <RoomLayout room={room} />;
}
