import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createRoom } from "../../services/roomService.js";
import useRoomStore from "../../stores/useRoomStore.js";
import useAuthStore from "../../stores/useAuthStore.js";
import ColorPicker from "../../components/common/ColorPicker.jsx";
import styles from "./RoomNew.module.css";

export default function RoomNew() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [maxParticipants, setMaxParticipants] = useState(10);
  const [color, setColor] = useState(null);
  const [error, setError] = useState("");
  const setRoom = useRoomStore((s) => s.setRoom);
  const user = useAuthStore((s) => s.user);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!color) {
      setError("내 색상을 선택해주세요.");
      return;
    }
    try {
      const res = await createRoom(title, maxParticipants, color);
      navigate(`/room/${res.data.data.id}`);
    } catch (err) {
      // 서버 미연결(네트워크 에러)이면 mock 방으로 이동
      if (!err.response) {
        const mockRoom = {
          id: `mock-${Date.now()}`,
          title,
          hostId: user?.id ?? "test-001",
          status: "ACTIVE",
          participants: [{ id: user?.id ?? "test-001", name: user?.name ?? "테스트유저", color }],
          confirmedDate: null,
          confirmedPlace: null,
        };
        setRoom(mockRoom);
        navigate(`/room/${mockRoom.id}`);
        return;
      }
      setError(err.response?.data?.error?.message ?? "방 생성에 실패했습니다.");
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h2 className={styles.title}>새 약속방 만들기</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>
            약속 이름
            <input
              className={styles.input}
              type="text"
              required
              placeholder="5월 주말 모임"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <div className={styles.label}>
            최대 인원 수
            <div className={styles.stepper}>
              <button
                type="button"
                className={styles.stepBtn}
                onClick={() => setMaxParticipants((v) => Math.max(1, v - 1))}
                disabled={maxParticipants <= 1}
              >−</button>
              <span className={styles.stepValue}>{maxParticipants}명</span>
              <button
                type="button"
                className={styles.stepBtn}
                onClick={() => setMaxParticipants((v) => Math.min(10, v + 1))}
                disabled={maxParticipants >= 10}
              >+</button>
            </div>
          </div>
          <div className={styles.label}>
            내 색상 선택
            <ColorPicker value={color} onChange={setColor} />
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.actions}>
            <Link className={styles.cancelBtn} to="/">취소</Link>
            <button className={styles.createBtn} type="submit" disabled={!color}>만들기</button>
          </div>
        </form>
      </div>
    </div>
  );
}
