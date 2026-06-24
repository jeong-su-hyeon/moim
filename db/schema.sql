-- ============================================================
--  moim — PostgreSQL Schema
--
--  실행 순서:
--  1. postgres DB 콘솔에서 DROP/CREATE DATABASE 실행
--  2. moim DB로 전환 후 나머지 전체 실행
--
--  * UUID DEFAULT 없음 — Hibernate가 애플리케이션에서 생성
--  * rooms ↔ places 순환 FK는 ALTER TABLE로 분리 처리
-- ============================================================


-- ============================================================
--  [postgres DB 콘솔에서 실행]
--  기존 moim DB 연결 강제 종료 후 삭제 & 재생성
-- ============================================================
SELECT pg_terminate_backend(pid)
FROM   pg_stat_activity
WHERE  datname = 'moim'
  AND  pid <> pg_backend_pid();

DROP DATABASE IF EXISTS moim;

CREATE DATABASE moim ENCODING = 'UTF8';


-- ============================================================
--  [moim DB로 전환 후 실행]
-- ============================================================


-- ============================================================
-- 1. users
-- ============================================================
CREATE TABLE users (
    id            UUID         NOT NULL,
    email         VARCHAR(255) NOT NULL,
    name          VARCHAR(100) NOT NULL,
    profile_url   VARCHAR(500),
    password_hash VARCHAR(255),
    provider      VARCHAR(20)  NOT NULL,
    provider_id   VARCHAR(255),
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id),
    CONSTRAINT uq_users_email UNIQUE (email)
);


-- ============================================================
-- 2. rooms  (confirmed_place_id FK는 places 생성 후 추가)
-- ============================================================
CREATE TABLE rooms (
    id                 UUID         NOT NULL,
    title              VARCHAR(200) NOT NULL,
    host_id            UUID         NOT NULL,
    status             VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    confirmed_date     DATE,
    confirmed_place_id UUID,
    created_at         TIMESTAMP    NOT NULL DEFAULT NOW(),
    expires_at         TIMESTAMP,
    max_participants   INTEGER      NOT NULL DEFAULT 10,
    PRIMARY KEY (id),
    CONSTRAINT fk_rooms_host FOREIGN KEY (host_id) REFERENCES users (id)
);


-- ============================================================
-- 3. room_participants  (복합 PK)
-- ============================================================
CREATE TABLE room_participants (
    room_id   UUID         NOT NULL,
    user_id   UUID         NOT NULL,
    color     VARCHAR(10)  NOT NULL,
    joined_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    PRIMARY KEY (room_id, user_id),
    CONSTRAINT fk_rp_room FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE,
    CONSTRAINT fk_rp_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);


-- ============================================================
-- 4. schedules  — 참여자별 가능 날짜
-- ============================================================
CREATE TABLE schedules (
    id             UUID NOT NULL,
    room_id        UUID NOT NULL,
    user_id        UUID NOT NULL,
    available_date DATE NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_schedule  UNIQUE (room_id, user_id, available_date),
    CONSTRAINT fk_sch_room  FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE,
    CONSTRAINT fk_sch_user  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);


-- ============================================================
-- 5. user_origins  — 참여자 출발지 (방당 1개)
-- ============================================================
CREATE TABLE user_origins (
    id      UUID             NOT NULL,
    room_id UUID             NOT NULL,
    user_id UUID             NOT NULL,
    lat     DOUBLE PRECISION NOT NULL,
    lng     DOUBLE PRECISION NOT NULL,
    label   VARCHAR(200),
    PRIMARY KEY (id),
    CONSTRAINT uq_origin  UNIQUE (room_id, user_id),
    CONSTRAINT fk_uo_room FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE,
    CONSTRAINT fk_uo_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);


-- ============================================================
-- 6. places  — 후보 장소
-- ============================================================
CREATE TABLE places (
    id            UUID             NOT NULL,
    room_id       UUID             NOT NULL,
    name          VARCHAR(200)     NOT NULL,
    address       VARCHAR(500),
    lat           DOUBLE PRECISION NOT NULL,
    lng           DOUBLE PRECISION NOT NULL,
    category      VARCHAR(20),
    registered_by UUID             NOT NULL,
    created_at    TIMESTAMP        NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id),
    CONSTRAINT fk_pl_room FOREIGN KEY (room_id)       REFERENCES rooms (id) ON DELETE CASCADE,
    CONSTRAINT fk_pl_user FOREIGN KEY (registered_by) REFERENCES users (id)
);


-- ============================================================
-- 6-1. place_likes  — 후보 장소 좋아요
-- ============================================================
CREATE TABLE place_likes (
    id         UUID      NOT NULL,
    place_id   UUID      NOT NULL,
    user_id    UUID      NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id),
    CONSTRAINT uq_place_likes        UNIQUE (place_id, user_id),
    CONSTRAINT fk_pl_likes_place FOREIGN KEY (place_id) REFERENCES places (id) ON DELETE CASCADE,
    CONSTRAINT fk_pl_likes_user  FOREIGN KEY (user_id)  REFERENCES users  (id) ON DELETE CASCADE
);

-- rooms.confirmed_place_id FK — 순환 참조이므로 places 생성 후 추가
ALTER TABLE rooms
    ADD CONSTRAINT fk_rooms_confirmed_place
    FOREIGN KEY (confirmed_place_id) REFERENCES places (id) ON DELETE SET NULL;


-- ============================================================
-- 7. travel_times  — Naver Directions 결과 캐시
-- ============================================================
CREATE TABLE travel_times (
    id            UUID        NOT NULL,
    place_id      UUID        NOT NULL,
    user_id       UUID        NOT NULL,
    transport     VARCHAR(20) NOT NULL,
    duration_min  INTEGER     NOT NULL,
    calculated_at TIMESTAMP   NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id),
    CONSTRAINT uq_travel   UNIQUE (place_id, user_id, transport),
    CONSTRAINT fk_tt_place FOREIGN KEY (place_id) REFERENCES places (id) ON DELETE CASCADE,
    CONSTRAINT fk_tt_user  FOREIGN KEY (user_id)  REFERENCES users  (id) ON DELETE CASCADE
);


-- ============================================================
-- 8. chat_messages
-- ============================================================
CREATE TABLE chat_messages (
    id      UUID      NOT NULL,
    room_id UUID      NOT NULL,
    user_id UUID      NOT NULL,
    content TEXT      NOT NULL,
    sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id),
    CONSTRAINT fk_cm_room FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE,
    CONSTRAINT fk_cm_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_chat_room_sent ON chat_messages (room_id, sent_at DESC);


-- ============================================================
-- 9. time_vote_sessions  — 시간 투표 세션 (방당 최대 1개)
-- ============================================================
CREATE TABLE time_vote_sessions (
    id         UUID      NOT NULL,
    room_id    UUID      NOT NULL,
    created_by UUID      NOT NULL,
    is_active  BOOLEAN   NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id),
    CONSTRAINT uq_tvs_room UNIQUE (room_id),
    CONSTRAINT fk_tvs_room FOREIGN KEY (room_id)    REFERENCES rooms (id) ON DELETE CASCADE,
    CONSTRAINT fk_tvs_user FOREIGN KEY (created_by) REFERENCES users (id)
);


-- ============================================================
-- 10. time_vote_options  — 투표 시간대 선택지
-- ============================================================
CREATE TABLE time_vote_options (
    id         UUID NOT NULL,
    session_id UUID NOT NULL,
    time_slot  TIME NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_tvo_slot    UNIQUE (session_id, time_slot),
    CONSTRAINT fk_tvo_session FOREIGN KEY (session_id) REFERENCES time_vote_sessions (id) ON DELETE CASCADE
);


-- ============================================================
-- 11. time_votes  — 참여자별 시간대 투표
-- ============================================================
CREATE TABLE time_votes (
    id        UUID      NOT NULL,
    option_id UUID      NOT NULL,
    user_id   UUID      NOT NULL,
    voted_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id),
    CONSTRAINT uq_tv_option_user UNIQUE (option_id, user_id),
    CONSTRAINT fk_tv_option FOREIGN KEY (option_id) REFERENCES time_vote_options (id) ON DELETE CASCADE,
    CONSTRAINT fk_tv_user   FOREIGN KEY (user_id)   REFERENCES users             (id) ON DELETE CASCADE
);


-- ============================================================
-- 12. refresh_tokens  — JWT Refresh Token 해시 저장
-- ============================================================
CREATE TABLE refresh_tokens (
    id         UUID         NOT NULL,
    user_id    UUID         NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP    NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_rt_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_refresh_user    ON refresh_tokens (user_id);
CREATE INDEX idx_rooms_expires_at ON rooms (expires_at) WHERE expires_at IS NOT NULL;


-- ============================================================
-- 13. shedlock  — 분산 스케줄러 중복 실행 방지
-- ============================================================
CREATE TABLE shedlock (
    name       VARCHAR(64)  NOT NULL,
    lock_until TIMESTAMP    NOT NULL,
    locked_at  TIMESTAMP    NOT NULL,
    locked_by  VARCHAR(255) NOT NULL,
    PRIMARY KEY (name)
);
