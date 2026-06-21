-- ============================================================
--  moim — PostgreSQL 테이블/컬럼 주석
--
--  실행 전제: schema.sql 이 먼저 실행되어 있어야 합니다.
--  실행 방법: moim DB에 접속한 상태에서 전체 실행
-- ============================================================


-- ============================================================
-- users
-- ============================================================
COMMENT ON TABLE  users                 IS '서비스 사용자. 로컬 가입과 소셜(Google·Kakao) 가입을 통합 관리한다.';
COMMENT ON COLUMN users.id              IS 'PK — 애플리케이션에서 UUID 생성';
COMMENT ON COLUMN users.email           IS '로그인 식별자. 소셜 로그인 시 소셜 계정 이메일. UNIQUE 제약';
COMMENT ON COLUMN users.name            IS '표시 이름 (닉네임)';
COMMENT ON COLUMN users.profile_url     IS '프로필 이미지 URL (소셜 제공 또는 null)';
COMMENT ON COLUMN users.password_hash   IS '로컬 로그인 비밀번호 해시. 소셜 전용 계정은 null';
COMMENT ON COLUMN users.provider        IS '가입 경로 — LOCAL / GOOGLE / KAKAO';
COMMENT ON COLUMN users.provider_id     IS '소셜 로그인 제공자 측 사용자 식별자. 로컬 계정은 null';
COMMENT ON COLUMN users.created_at      IS '계정 생성 일시';


-- ============================================================
-- rooms
-- ============================================================
COMMENT ON TABLE  rooms                    IS '약속방. 참여자들이 날짜·장소를 조율하는 단위 공간이다.';
COMMENT ON COLUMN rooms.id                 IS 'PK — 애플리케이션에서 UUID 생성';
COMMENT ON COLUMN rooms.title              IS '약속방 이름 (최대 200자)';
COMMENT ON COLUMN rooms.host_id            IS 'FK → users.id. 방장 사용자. 방 삭제·확정 권한 보유';
COMMENT ON COLUMN rooms.status             IS '방 상태 — ACTIVE(진행중) / CONFIRMED(확정) / CANCELLED(취소)';
COMMENT ON COLUMN rooms.confirmed_date     IS '확정된 약속 날짜. 미확정이면 null';
COMMENT ON COLUMN rooms.confirmed_place_id IS 'FK → places.id. 확정된 약속 장소. 미확정이면 null';
COMMENT ON COLUMN rooms.created_at         IS '방 생성 일시';
COMMENT ON COLUMN rooms.expires_at         IS '방 자동 파기 일시. confirmed_date + 1개월. 미확정이면 null';
COMMENT ON COLUMN rooms.max_participants   IS '최대 참여 인원 (1~10명). 방장이 생성 또는 설정 시 지정';


-- ============================================================
-- room_participants
-- ============================================================
COMMENT ON TABLE  room_participants           IS '약속방 참여자 매핑. (room_id, user_id) 복합 PK로 중복 참가를 방지한다.';
COMMENT ON COLUMN room_participants.room_id   IS 'PK(복합) + FK → rooms.id';
COMMENT ON COLUMN room_participants.user_id   IS 'PK(복합) + FK → users.id';
COMMENT ON COLUMN room_participants.joined_at IS '방 참가 일시';


-- ============================================================
-- schedules
-- ============================================================
COMMENT ON TABLE  schedules                IS '참여자별 가능 날짜. 한 방에서 동일 사용자·날짜 조합은 UNIQUE 제약으로 중복 저장을 막는다.';
COMMENT ON COLUMN schedules.id             IS 'PK — 애플리케이션에서 UUID 생성';
COMMENT ON COLUMN schedules.room_id        IS 'FK → rooms.id. 어느 방의 일정인지';
COMMENT ON COLUMN schedules.user_id        IS 'FK → users.id. 일정을 등록한 참여자';
COMMENT ON COLUMN schedules.available_date IS '참여자가 가능하다고 선택한 날짜';


-- ============================================================
-- user_origins
-- ============================================================
COMMENT ON TABLE  user_origins          IS '방별 참여자 출발지 좌표. 방당 사용자 1개만 허용 (UNIQUE 제약).';
COMMENT ON COLUMN user_origins.id       IS 'PK — 애플리케이션에서 UUID 생성';
COMMENT ON COLUMN user_origins.room_id  IS 'FK → rooms.id. 어느 방의 출발지인지';
COMMENT ON COLUMN user_origins.user_id  IS 'FK → users.id. 출발지를 등록한 참여자';
COMMENT ON COLUMN user_origins.lat      IS '출발지 위도';
COMMENT ON COLUMN user_origins.lng      IS '출발지 경도';
COMMENT ON COLUMN user_origins.label    IS '출발지 대략적 주소 레이블 (예: 강남구). 선택 입력';


-- ============================================================
-- places
-- ============================================================
COMMENT ON TABLE  places               IS '후보 장소. 참여자가 지도에서 핀을 찍어 등록하며, 방별로 여러 개 존재할 수 있다.';
COMMENT ON COLUMN places.id            IS 'PK — 애플리케이션에서 UUID 생성';
COMMENT ON COLUMN places.room_id       IS 'FK → rooms.id. 어느 방의 후보 장소인지';
COMMENT ON COLUMN places.name          IS '장소 이름 (최대 200자)';
COMMENT ON COLUMN places.address       IS '장소 주소 (최대 500자). Naver Geocoding 결과';
COMMENT ON COLUMN places.lat           IS '장소 위도';
COMMENT ON COLUMN places.lng           IS '장소 경도';
COMMENT ON COLUMN places.category      IS '장소 카테고리 — RESTAURANT(음식점) / CAFE(카페) / ACTIVITY(활동)';
COMMENT ON COLUMN places.registered_by IS 'FK → users.id. 장소를 등록한 참여자';
COMMENT ON COLUMN places.created_at    IS '장소 등록 일시';


-- ============================================================
-- place_likes
-- ============================================================
COMMENT ON TABLE  place_likes            IS '후보 장소 좋아요. (place_id, user_id) UNIQUE 제약으로 중복 좋아요를 방지한다.';
COMMENT ON COLUMN place_likes.id         IS 'PK — 애플리케이션에서 UUID 생성';
COMMENT ON COLUMN place_likes.place_id   IS 'FK → places.id. 좋아요를 받은 장소';
COMMENT ON COLUMN place_likes.user_id    IS 'FK → users.id. 좋아요를 누른 사용자';
COMMENT ON COLUMN place_likes.created_at IS '좋아요 등록 일시';


-- ============================================================
-- travel_times
-- ============================================================
COMMENT ON TABLE  travel_times              IS 'Naver Directions API 이동 시간 캐시. 동일 (장소, 사용자, 이동수단) 조합은 재호출 없이 캐시 값을 반환한다.';
COMMENT ON COLUMN travel_times.id           IS 'PK — 애플리케이션에서 UUID 생성';
COMMENT ON COLUMN travel_times.place_id     IS 'FK → places.id. 도착 후보 장소';
COMMENT ON COLUMN travel_times.user_id      IS 'FK → users.id. 출발 사용자 (user_origins 와 쌍을 이룸)';
COMMENT ON COLUMN travel_times.transport    IS '이동 수단 — TRANSIT(대중교통) / CAR(자동차) / WALK(도보)';
COMMENT ON COLUMN travel_times.duration_min IS '이동 소요 시간 (분)';
COMMENT ON COLUMN travel_times.calculated_at IS 'API 호출 및 캐시 저장 일시';


-- ============================================================
-- chat_messages
-- ============================================================
COMMENT ON TABLE  chat_messages         IS '약속방 채팅 메시지. WebSocket(STOMP)으로 실시간 전송되며 이 테이블에 영속화된다.';
COMMENT ON COLUMN chat_messages.id      IS 'PK — 애플리케이션에서 UUID 생성';
COMMENT ON COLUMN chat_messages.room_id IS 'FK → rooms.id. 메시지가 속한 약속방';
COMMENT ON COLUMN chat_messages.user_id IS 'FK → users.id. 메시지를 보낸 사용자';
COMMENT ON COLUMN chat_messages.content IS '메시지 본문';
COMMENT ON COLUMN chat_messages.sent_at IS '메시지 전송 일시. 커서 페이지네이션 기준값으로 사용';


-- ============================================================
-- time_vote_sessions
-- ============================================================
COMMENT ON TABLE  time_vote_sessions            IS '시간 투표 세션. 방당 최대 1개(UNIQUE 제약). 방장이 생성하며 시간대 선택지의 상위 단위이다.';
COMMENT ON COLUMN time_vote_sessions.id         IS 'PK — 애플리케이션에서 UUID 생성';
COMMENT ON COLUMN time_vote_sessions.room_id    IS 'FK → rooms.id. 투표가 속한 약속방. UNIQUE 제약으로 방당 1개만 허용';
COMMENT ON COLUMN time_vote_sessions.created_by IS 'FK → users.id. 투표 세션을 생성한 사용자 (방장)';
COMMENT ON COLUMN time_vote_sessions.is_active  IS '투표 활성 여부. false이면 마감된 투표';
COMMENT ON COLUMN time_vote_sessions.created_at IS '투표 세션 생성 일시';


-- ============================================================
-- time_vote_options
-- ============================================================
COMMENT ON TABLE  time_vote_options            IS '시간 투표 선택지. 세션 안에서 투표 가능한 시간대 목록이다.';
COMMENT ON COLUMN time_vote_options.id         IS 'PK — 애플리케이션에서 UUID 생성';
COMMENT ON COLUMN time_vote_options.session_id IS 'FK → time_vote_sessions.id. 소속 투표 세션';
COMMENT ON COLUMN time_vote_options.time_slot  IS '투표 대상 시간 (TIME 타입). 세션 내 중복 불가';


-- ============================================================
-- time_votes
-- ============================================================
COMMENT ON TABLE  time_votes            IS '참여자별 시간대 투표. (option_id, user_id) UNIQUE 제약으로 동일 선택지에 중복 투표를 방지한다.';
COMMENT ON COLUMN time_votes.id         IS 'PK — 애플리케이션에서 UUID 생성';
COMMENT ON COLUMN time_votes.option_id  IS 'FK → time_vote_options.id. 선택한 시간대';
COMMENT ON COLUMN time_votes.user_id    IS 'FK → users.id. 투표한 사용자';
COMMENT ON COLUMN time_votes.voted_at   IS '투표 일시';


-- ============================================================
-- refresh_tokens
-- ============================================================
COMMENT ON TABLE  refresh_tokens            IS 'JWT Refresh Token 해시 저장소. 토큰 로테이션 정책으로 재발급 시 기존 행을 교체한다.';
COMMENT ON COLUMN refresh_tokens.id         IS 'PK — 애플리케이션에서 UUID 생성';
COMMENT ON COLUMN refresh_tokens.user_id    IS 'FK → users.id. 토큰 소유 사용자';
COMMENT ON COLUMN refresh_tokens.token_hash IS 'Refresh Token BCrypt 해시 값. 원문은 저장하지 않는다.';
COMMENT ON COLUMN refresh_tokens.expires_at IS '토큰 만료 일시. 스케줄러 또는 갱신 시 만료 토큰 정리에 활용';


-- ============================================================
-- shedlock
-- ============================================================
COMMENT ON TABLE  shedlock           IS '분산 환경 스케줄러 중복 실행 방지 락 테이블. ShedLock 라이브러리가 관리한다.';
COMMENT ON COLUMN shedlock.name      IS 'PK — 락 이름 (스케줄러 작업 식별자)';
COMMENT ON COLUMN shedlock.lock_until IS '락 유지 만료 시각. 이 시각 이후 다른 인스턴스가 락 획득 가능';
COMMENT ON COLUMN shedlock.locked_at  IS '락 획득 일시';
COMMENT ON COLUMN shedlock.locked_by  IS '락을 획득한 서버 인스턴스 식별자';
