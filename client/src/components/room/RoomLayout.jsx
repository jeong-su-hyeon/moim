import { useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TABS } from '../../constants/index.js';
import CalendarView from '../calendar/CalendarView.jsx';
import MapView from '../map/MapView.jsx';
import ChatPanel from '../chat/ChatPanel.jsx';
import Toast from '../common/Toast.jsx';
import useWebSocket from '../../hooks/useWebSocket.js';
import useScheduleStore from '../../stores/useScheduleStore.js';
import useRoomStore from '../../stores/useRoomStore.js';
import useAuthStore from '../../stores/useAuthStore.js';
import useLocationStore from '../../stores/useLocationStore.js';
import { getAggregatedSchedules } from '../../services/scheduleService.js';
import { confirmRoom, unconfirmRoom, updateRoom, deleteRoom, leaveRoom } from '../../services/roomService.js';
import { colorHex } from '../../constants/index.js';
import styles from './RoomLayout.module.css';

const NAV_ITEMS = [
  { tab: TABS.DATE, label: '날짜\n선택', icon: '📅' },
  { tab: TABS.PLACE, label: '장소\n선택', icon: '📍' },
  { tab: TABS.RESULT, label: '최종\n약속', icon: '✅' },
];

export default function RoomLayout({ room }) {
  const [activeTab, setActiveTab] = useState(TABS.DATE);
  const [copyToast, setCopyToast] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const { setAggregated, aggregated } = useScheduleStore();
  const { updatePlaceLike, addCandidate, removeCandidate, updatePlace } = useLocationStore();
  const { setRoom, setParticipants } = useRoomStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    if (tab === TABS.RESULT) {
      getAggregatedSchedules(room?.id)
        .then((r) => setAggregated(r.data.data ?? {}))
        .catch(() => {});
    }
  }, [room?.id, setAggregated]);

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/room/${room?.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyToast('초대 링크가 복사되었습니다.');
    } catch {
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopyToast('초대 링크가 복사되었습니다.');
    }
  };

  const onScheduleUpdate = useCallback(
    (agg) => setAggregated(agg),
    [setAggregated]
  );

  const onRoomUpdate = useCallback(
    (updatedRoom) => {
      setRoom(updatedRoom);
      setParticipants(updatedRoom.participants ?? []);
    },
    [setRoom, setParticipants]
  );

  const onLikeUpdate = useCallback(
    (data) => {
      const currentUserId = useAuthStore.getState().user?.id;
      updatePlaceLike(data.placeId, data.likeCount, data.likedUserIds, currentUserId);
    },
    [updatePlaceLike]
  );

  const onPlaceUpdate = useCallback((data) => {
    if (data.type === 'ADD') addCandidate(data.place);
    else if (data.type === 'DELETE') removeCandidate(data.placeId);
    else if (data.type === 'UPDATE') updatePlace(data.place);
  }, [addCandidate, removeCandidate, updatePlace]);

  const { sendMessage, loadMore } = useWebSocket(room?.id, {
    onScheduleUpdate,
    onRoomUpdate,
    onLikeUpdate,
    onPlaceUpdate,
  });

  return (
    <div className={styles.layout}>
      {/* 모바일 상단 헤더 */}
      <header className={styles.mobileHeader}>
        <span className={styles.mobileTitle}>{room?.title ?? '모임'}</span>
        <div className={styles.mobileHeaderActions}>
          <button className={styles.mobileIconBtn} onClick={handleCopyLink} title="초대 링크 복사">🔗</button>
          <button className={styles.mobileIconBtn} onClick={() => setShowParticipants(true)} title="참여자 목록">👥</button>
          <button className={styles.mobileIconBtn} onClick={() => setShowSettings(true)} title="설정">⚙️</button>
          <Link to="/" className={styles.mobileIconBtn} title="홈으로">🏠</Link>
        </div>
      </header>

      {/* 왼쪽 세로 네비게이션 (데스크톱) */}
      <nav className={styles.nav}>
        <div className={styles.navTitle}>
          <span className={styles.navTitleText}>{room?.title ?? '모임'}</span>
          <button className={styles.copyBtn} onClick={handleCopyLink} title="초대 링크 복사">
            🔗
          </button>
        </div>
        <ul className={styles.navList}>
          {NAV_ITEMS.map(({ tab, label, icon }) => (
            <li key={tab}>
              <button
                className={`${styles.navBtn} ${activeTab === tab ? styles.navBtnActive : ''}`}
                onClick={() => handleTabChange(tab)}
              >
                <span className={styles.navIcon}>{icon}</span>
                <span className={styles.navLabel}>{label}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className={styles.navBottom}>
          <button
            className={styles.navIconBtn}
            onClick={() => setShowParticipants(true)}
            title="참여자 목록"
          >
            👥
          </button>
          <button
            className={styles.navIconBtn}
            onClick={() => setShowSettings(true)}
            title="설정"
          >
            ⚙️
          </button>
          <Link to="/" className={styles.homeBtn} title="홈으로">
            🏠
          </Link>
        </div>
      </nav>

      {/* 메인 콘텐츠 */}
      <main className={styles.main}>
        {activeTab === TABS.DATE && <CalendarView roomId={room?.id} />}
        {activeTab === TABS.PLACE && <MapView roomId={room?.id} />}
        {activeTab === TABS.RESULT && <ResultView room={room} aggregated={aggregated} />}
      </main>

      {/* 채팅 패널: 데스크톱은 고정 패널, 모바일은 토글 드로어 */}
      <div className={`${styles.chatWrap} ${showChat ? styles.chatWrapOpen : ''}`}>
        <ChatPanel
          roomId={room?.id}
          roomTitle={room?.title}
          sendMessage={sendMessage}
          loadMore={loadMore}
          onClose={() => setShowChat(false)}
        />
      </div>
      {showChat && <div className={styles.chatBackdrop} onClick={() => setShowChat(false)} />}

      {/* 모바일 하단 탭바 */}
      <nav className={styles.bottomBar}>
        {NAV_ITEMS.map(({ tab, label, icon }) => (
          <button
            key={tab}
            className={`${styles.bottomBarBtn} ${activeTab === tab && !showChat ? styles.bottomBarBtnActive : ''}`}
            onClick={() => { setShowChat(false); handleTabChange(tab); }}
          >
            <span className={styles.bottomBarIcon}>{icon}</span>
            <span className={styles.bottomBarLabel}>{label.replace('\n', ' ')}</span>
          </button>
        ))}
        <button
          className={`${styles.bottomBarBtn} ${showChat ? styles.bottomBarBtnActive : ''}`}
          onClick={() => setShowChat(true)}
        >
          <span className={styles.bottomBarIcon}>💬</span>
          <span className={styles.bottomBarLabel}>채팅</span>
        </button>
      </nav>

      {copyToast && <Toast message={copyToast} onClose={() => setCopyToast(null)} />}

      {/* 참여자 목록 모달 */}
      {showParticipants && (
        <ParticipantsModal
          room={room}
          onClose={() => setShowParticipants(false)}
        />
      )}

      {/* 설정 모달 */}
      {showSettings && (
        <SettingsModal
          room={room}
          user={user}
          onClose={() => setShowSettings(false)}
          onRoomUpdated={(updated) => setRoom(updated)}
          onDeleted={() => navigate('/')}
          onLeft={() => navigate('/')}
        />
      )}
    </div>
  );
}

function ParticipantsModal({ room, onClose }) {
  const { user } = useAuthStore();
  const participants = room?.participants ?? [];

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>참여자 목록</h3>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <section className={styles.settingSection}>
          <p className={styles.settingLabel}>{participants.length} / {room?.maxParticipants ?? 10}명 참여 중</p>
          <ul className={styles.participantList}>
            {participants.map((p) => (
              <li key={p.id} className={styles.participantItem}>
                <div className={styles.participantAvatar} style={{ backgroundColor: colorHex(p.color), color: '#fff' }}>
                  {p.name?.charAt(0)}
                </div>
                <span className={styles.participantName}>
                  {p.name}
                  {p.id === user?.id && <span className={styles.meTag}>나</span>}
                </span>
                {p.id === room?.hostId && (
                  <span className={styles.hostBadge}>👑 방장</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function SettingsModal({ room, user, onClose, onRoomUpdated, onDeleted, onLeft }) {
  const isHost = room?.hostId === user?.id;
  const others = (room?.participants ?? []).filter((p) => p.id !== user?.id);

  const [step, setStep] = useState('main');
  const [selectedNewHost, setSelectedNewHost] = useState(null);

  const [renameValue, setRenameValue] = useState(room?.title ?? '');
  const [maxParticipants, setMaxParticipants] = useState(room?.maxParticipants ?? 10);
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [toast, setToast] = useState(null);

  const handleRename = async () => {
    const trimmed = renameValue.trim();
    const titleChanged = trimmed && trimmed !== room?.title;
    const maxChanged = isHost && maxParticipants !== (room?.maxParticipants ?? 10);
    if (!titleChanged && !maxChanged) return;
    setRenaming(true);
    try {
      const payload = {};
      if (titleChanged) payload.title = trimmed;
      if (maxChanged) payload.maxParticipants = maxParticipants;
      const res = await updateRoom(room.id, payload);
      onRoomUpdated(res.data.data);
      setToast('설정이 저장되었습니다.');
    } catch (err) {
      const code = err.response?.data?.error?.code;
      if (code === 'MAX_PARTICIPANTS_TOO_SMALL') {
        setToast('현재 참여 인원보다 적게 설정할 수 없습니다.');
      } else {
        setToast('저장에 실패했습니다.');
      }
    } finally {
      setRenaming(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('약속방을 삭제하면 모든 데이터가 사라집니다. 정말 삭제하시겠습니까?')) return;
    setDeleting(true);
    try {
      await deleteRoom(room.id);
      onDeleted();
    } catch {
      setToast('삭제에 실패했습니다.');
      setDeleting(false);
    }
  };

  const handleLeaveClick = () => {
    if (isHost && others.length > 0) {
      setSelectedNewHost(others[0].id);
      setStep('transferHost');
    } else {
      handleLeaveConfirm(null);
    }
  };

  const handleLeaveConfirm = async (newHostId) => {
    setLeaving(true);
    try {
      await leaveRoom(room.id, newHostId);
      onLeft();
    } catch {
      setToast('나가기에 실패했습니다.');
      setLeaving(false);
    }
  };

  // ── 방장 위임 선택 화면 ──
  if (step === 'transferHost') {
    const selectedName = others.find((p) => p.id === selectedNewHost)?.name ?? '';
    return (
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h3 className={styles.modalTitle}>방장 위임</h3>
            <button className={styles.modalClose} onClick={onClose}>✕</button>
          </div>

          <section className={styles.settingSection}>
            <p className={styles.settingLabel}>방장을 넘길 참여자를 선택하세요</p>
            <ul className={styles.participantList}>
              {others.map((p) => (
                <li key={p.id}>
                  <label className={`${styles.participantItem} ${styles.participantItemSelectable}`}>
                    <input
                      type="radio"
                      name="newHost"
                      value={p.id}
                      checked={selectedNewHost === p.id}
                      onChange={() => setSelectedNewHost(p.id)}
                      className={styles.participantRadio}
                    />
                    <div className={`${styles.participantAvatar} ${selectedNewHost === p.id ? styles.participantAvatarSelected : ''}`}>
                      {p.name?.charAt(0)}
                    </div>
                    <span className={styles.participantName}>{p.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          </section>

          <div className={styles.transferFooter}>
            <button
              className={styles.leaveBtn}
              onClick={() => handleLeaveConfirm(selectedNewHost)}
              disabled={!selectedNewHost || leaving}
            >
              {leaving ? '처리 중...' : `${selectedName}에게 위임하고 나가기`}
            </button>
            <button className={styles.backLink} onClick={() => setStep('main')}>
              설정으로 돌아가기
            </button>
          </div>

          {toast && <Toast message={toast} onClose={() => setToast(null)} />}
        </div>
      </div>
    );
  }

  // ── 기본 설정 화면 ──
  const currentCount = room?.participants?.length ?? 0;
  const hasChanges =
    (renameValue.trim() && renameValue.trim() !== room?.title) ||
    (isHost && maxParticipants !== (room?.maxParticipants ?? 10));

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>약속방 설정</h3>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        <div className={styles.settingsBody}>
          {/* 방 이름 */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>방 이름</label>
            <input
              className={styles.fieldInput}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              maxLength={200}
            />
          </div>

          {/* 최대 인원 */}
          {isHost && (
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>최대 인원</label>
              <div className={styles.stepperWrap}>
                <button
                  type="button"
                  className={styles.stepBtn}
                  onClick={() => setMaxParticipants((v) => Math.max(1, v - 1))}
                  disabled={maxParticipants <= currentCount}
                >−</button>
                <span className={styles.stepValue}>{maxParticipants}명</span>
                <button
                  type="button"
                  className={styles.stepBtn}
                  onClick={() => setMaxParticipants((v) => Math.min(10, v + 1))}
                  disabled={maxParticipants >= 10}
                >+</button>
              </div>
              <p className={styles.stepHint}>현재 {currentCount}명 참여 중</p>
            </div>
          )}

          {/* 저장 버튼 */}
          <button
            className={styles.saveBtn}
            onClick={handleRename}
            disabled={renaming || !hasChanges}
          >
            {renaming ? '저장 중...' : '저장하기'}
          </button>

          {/* 구분선 + 위험 액션 */}
          <div className={styles.dangerDivider} />
          <div className={styles.dangerGroup}>
            <button
              className={styles.leaveBtn}
              onClick={handleLeaveClick}
              disabled={leaving}
            >
              약속방 나가기
            </button>
            {isHost && (
              <button
                className={styles.deleteBtn}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? '삭제 중...' : '약속방 삭제'}
              </button>
            )}
          </div>
        </div>

        {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      </div>
    </div>
  );
}

function ResultView({ room, aggregated }) {
  const { participants, setRoom } = useRoomStore();
  const { user } = useAuthStore();
  const isHost = room?.hostId === user?.id;
  const isConfirmed = !!room?.confirmedDate;
  const totalCount = (room?.participants ?? participants).length || 0;
  const [selectedDate, setSelectedDate] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [unconfirming, setUnconfirming] = useState(false);
  const [toast, setToast] = useState(null);

  const entries = Object.entries(aggregated ?? {});
  const getParticipants = (val) => (Array.isArray(val) ? val : []);
  const getCount = (val) => getParticipants(val).length;

  let topDate = null;
  let maxCount = 0;

  if (entries.length > 0) {
    maxCount = Math.max(...entries.map(([, v]) => getCount(v)));
    topDate = entries
      .filter(([, v]) => getCount(v) === maxCount)
      .map(([date]) => date)
      .sort()[0];
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    return `${dateStr} (${weekdays[d.getDay()]})`;
  };

  const sortedEntries = [...entries].sort(([a], [b]) => a.localeCompare(b));

  const handleConfirm = async () => {
    if (!selectedDate) return;
    setConfirming(true);
    try {
      const res = await confirmRoom(room.id, selectedDate);
      setRoom(res.data.data);
      setSelectedDate(null);
    } catch (err) {
      const code = err.response?.data?.error?.code;
      if (code === 'FORBIDDEN') setToast('방장만 날짜를 확정할 수 있습니다.');
      else setToast('확정에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setConfirming(false);
    }
  };

  const handleUnconfirm = async () => {
    setUnconfirming(true);
    try {
      const res = await unconfirmRoom(room.id);
      setRoom(res.data.data);
    } catch {
      setToast('확정 취소에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setUnconfirming(false);
    }
  };

  const showSelectUI = isHost && !isConfirmed;

  return (
    <div className={styles.resultWrap}>
      <h2 className={styles.resultTitle}>최종 약속 날짜</h2>

      {entries.length === 0 ? (
        <p className={styles.resultEmpty}>아직 일정을 입력한 참여자가 없습니다.</p>
      ) : (
        <>
          {topDate && (
            <div className={`${styles.resultBest} ${selectedDate === topDate ? styles.resultBestSelected : ''}`}>
              <span className={styles.resultBestLabel}>최다 선택 날짜</span>
              <p className={styles.resultBestDate}>{formatDate(topDate)}</p>
              <p className={styles.resultBestCount}>
                {totalCount > 0
                  ? `${totalCount}명 중 ${maxCount}명 가능`
                  : `${maxCount}명 가능`}
              </p>
              <p className={styles.resultNames}>
                {getParticipants(aggregated[topDate]).map((p) => (
                  <span key={p.id} className={styles.resultNamesItem}>
                    <span className={styles.miniDot} style={{ background: colorHex(p.color) }} />
                    {p.name}
                  </span>
                ))}
              </p>
            </div>
          )}

          <div className={styles.resultAllWrap}>
            <p className={styles.resultAllTitle}>날짜 후보</p>
            <ul className={styles.resultAllList}>
              {sortedEntries.map(([date, val]) => {
                const isConfirmedDate = isConfirmed && date === String(room.confirmedDate);
                const Row = showSelectUI ? 'label' : 'div';
                return (
                <li key={date}>
                  <Row
                    className={[
                      styles.resultAllItem,
                      showSelectUI ? styles.resultAllItemClickable : '',
                      selectedDate === date ? styles.resultAllItemSelected : '',
                      isConfirmedDate ? styles.resultAllItemConfirmed : '',
                    ].join(' ')}
                  >
                    {showSelectUI && (
                      <input
                        type="radio"
                        name="confirmedDate"
                        value={date}
                        checked={selectedDate === date}
                        onChange={() => setSelectedDate(date)}
                        className={styles.resultRadio}
                      />
                    )}
                    <span className={styles.resultAllDate}>{formatDate(date)}</span>
                    <span className={styles.resultAllRight}>
                      <span className={styles.resultAllNames}>
                        {getParticipants(val).map((p) => (
                          <span key={p.id} className={styles.resultNamesItem}>
                            <span className={styles.miniDot} style={{ background: colorHex(p.color) }} />
                            {p.name}
                          </span>
                        ))}
                      </span>
                      <span className={styles.resultAllCount}>{getCount(val)}명</span>
                      {isConfirmedDate && <span className={styles.confirmedBadge}>확정</span>}
                    </span>
                  </Row>
                </li>
                );
              })}
            </ul>
          </div>

          {showSelectUI && (
            <button
              className={styles.resultConfirmBtn}
              disabled={!selectedDate || confirming}
              onClick={handleConfirm}
            >
              {confirming ? '처리 중...' : '확정 날짜 선택하기'}
            </button>
          )}

          {isHost && isConfirmed && (
            <button
              className={styles.unconfirmBtn}
              disabled={unconfirming}
              onClick={handleUnconfirm}
            >
              {unconfirming ? '처리 중...' : '확정 날짜 취소'}
            </button>
          )}
        </>
      )}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
