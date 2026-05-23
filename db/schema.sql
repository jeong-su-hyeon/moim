-- ============================================================
--  약속 잡기 서비스 (mo!m) - Database Schema
--  MySQL 8.0
-- ============================================================

CREATE DATABASE IF NOT EXISTS moim
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE moim;

-- ============================================================
-- 1. users
--    이메일/소셜 통합 계정. email은 이메일 가입자만 값이 있음.
-- ============================================================
CREATE TABLE users (
  id               BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  email            VARCHAR(255)     UNIQUE,
  password_hash    VARCHAR(255),
  nickname         VARCHAR(50)      NOT NULL,
  profile_image_url VARCHAR(500),
  created_at       DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  -- 이메일 가입이면 반드시 비밀번호가 있어야 함 (앱 레이어에서 함께 보장)
  CONSTRAINT chk_email_login CHECK (
    (email IS NULL AND password_hash IS NULL) OR
    (email IS NOT NULL)
  )
) ENGINE=InnoDB;

-- ============================================================
-- 2. social_accounts
--    소셜 로그인 연동 (Google / Kakao). 한 유저가 여러 소셜 계정 보유 가능.
-- ============================================================
CREATE TABLE social_accounts (
  id          BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED  NOT NULL,
  provider    ENUM('google', 'kakao') NOT NULL,
  provider_id VARCHAR(255)     NOT NULL,
  created_at  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_provider_account (provider, provider_id),
  CONSTRAINT fk_sa_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 3. meeting_rooms
--    약속방. uuid는 초대 링크 끝에 붙는 고유값.
--    최대 참여 인원 10명 제약은 room_participants INSERT 시 앱/트리거로 강제.
--    expires_at: 약속 확정일 기준 +1개월, 스케줄러로 자동 파기.
-- ============================================================
CREATE TABLE meeting_rooms (
  id                     BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  uuid                   CHAR(36)         NOT NULL,
  title                  VARCHAR(100)     NOT NULL,
  description            TEXT,
  creator_id             BIGINT UNSIGNED  NOT NULL,
  status                 ENUM('active', 'confirmed', 'cancelled') NOT NULL DEFAULT 'active',
  confirmed_date         DATE,
  confirmed_time         TIME,
  confirmed_location_id  BIGINT UNSIGNED,          -- candidate_locations FK: 후방 선언
  expires_at             DATETIME,                 -- confirmed_date + INTERVAL 1 MONTH
  created_at             DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_room_uuid (uuid),
  CONSTRAINT fk_mr_creator FOREIGN KEY (creator_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- ============================================================
-- 4. room_participants
--    방 참여자. host = 방 생성자(creator), member = 일반 참여자.
--    최대 10명 제약을 트리거로 보장.
-- ============================================================
CREATE TABLE room_participants (
  id        BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  room_id   BIGINT UNSIGNED  NOT NULL,
  user_id   BIGINT UNSIGNED  NOT NULL,
  role      ENUM('host', 'member') NOT NULL DEFAULT 'member',
  joined_at DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_room_user (room_id, user_id),
  CONSTRAINT fk_rp_room FOREIGN KEY (room_id) REFERENCES meeting_rooms(id) ON DELETE CASCADE,
  CONSTRAINT fk_rp_user FOREIGN KEY (user_id) REFERENCES users(id)     ON DELETE CASCADE
) ENGINE=InnoDB;

-- 참여 인원 10명 초과 방지 트리거
DELIMITER $$
CREATE TRIGGER trg_max_participants
BEFORE INSERT ON room_participants
FOR EACH ROW
BEGIN
  DECLARE cnt INT;
  SELECT COUNT(*) INTO cnt FROM room_participants WHERE room_id = NEW.room_id;
  IF cnt >= 10 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = '약속방 최대 참여 인원(10명)을 초과할 수 없습니다.';
  END IF;
END$$
DELIMITER ;

-- ============================================================
-- 5. date_availability
--    참여자별 가능 날짜. 캘린더 UI에서 선택한 날짜마다 한 행.
-- ============================================================
CREATE TABLE date_availability (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  room_id        BIGINT UNSIGNED NOT NULL,
  user_id        BIGINT UNSIGNED NOT NULL,
  available_date DATE            NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_availability (room_id, user_id, available_date),
  CONSTRAINT fk_da_room FOREIGN KEY (room_id) REFERENCES meeting_rooms(id) ON DELETE CASCADE,
  CONSTRAINT fk_da_user FOREIGN KEY (user_id) REFERENCES users(id)         ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 6. departure_locations
--    참여자별 출발지 (방당 1개). is_approximate: 대략적 위치 여부.
-- ============================================================
CREATE TABLE departure_locations (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  room_id        BIGINT UNSIGNED NOT NULL,
  user_id        BIGINT UNSIGNED NOT NULL,
  address        VARCHAR(500),
  latitude       DECIMAL(10, 7)  NOT NULL,
  longitude      DECIMAL(10, 7)  NOT NULL,
  is_approximate TINYINT(1)      NOT NULL DEFAULT 0,
  created_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_departure (room_id, user_id),
  CONSTRAINT fk_dl_room FOREIGN KEY (room_id) REFERENCES meeting_rooms(id) ON DELETE CASCADE,
  CONSTRAINT fk_dl_user FOREIGN KEY (user_id) REFERENCES users(id)         ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 7. candidate_locations
--    후보 장소. Naver 지도 API로 검색 후 핀을 찍어 등록.
-- ============================================================
CREATE TABLE candidate_locations (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  room_id        BIGINT UNSIGNED NOT NULL,
  proposed_by    BIGINT UNSIGNED NOT NULL,
  name           VARCHAR(200)    NOT NULL,
  address        VARCHAR(500)    NOT NULL,
  latitude       DECIMAL(10, 7)  NOT NULL,
  longitude      DECIMAL(10, 7)  NOT NULL,
  category       VARCHAR(100),                   -- 음식점, 카페 등
  naver_place_id VARCHAR(100),                   -- Naver 장소 고유 ID
  created_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_cl_room     FOREIGN KEY (room_id)     REFERENCES meeting_rooms(id) ON DELETE CASCADE,
  CONSTRAINT fk_cl_proposer FOREIGN KEY (proposed_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- confirmed_location_id FK (candidate_locations 생성 후 추가)
ALTER TABLE meeting_rooms
  ADD CONSTRAINT fk_mr_confirmed_location
  FOREIGN KEY (confirmed_location_id)
  REFERENCES candidate_locations(id)
  ON DELETE SET NULL;

-- ============================================================
-- 8. travel_times
--    Naver 길찾기 API 호출 결과 캐시.
--    (candidate_location, departure_location, transport_mode) 조합당 저장.
-- ============================================================
CREATE TABLE travel_times (
  id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  candidate_location_id BIGINT UNSIGNED NOT NULL,
  departure_location_id BIGINT UNSIGNED NOT NULL,
  user_id               BIGINT UNSIGNED NOT NULL,
  transport_mode        ENUM('transit', 'car', 'walk', 'bike') NOT NULL DEFAULT 'transit',
  estimated_minutes     SMALLINT UNSIGNED NOT NULL,
  departure_time        DATETIME,                 -- 출발 기준 시각 (null이면 현재 기준)
  calculated_at         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_travel (candidate_location_id, departure_location_id, transport_mode, departure_time),
  CONSTRAINT fk_tt_candidate  FOREIGN KEY (candidate_location_id) REFERENCES candidate_locations(id) ON DELETE CASCADE,
  CONSTRAINT fk_tt_departure  FOREIGN KEY (departure_location_id) REFERENCES departure_locations(id) ON DELETE CASCADE,
  CONSTRAINT fk_tt_user       FOREIGN KEY (user_id)               REFERENCES users(id)               ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 9. time_vote_sessions
--    '시간 정하기' 투표 세션. 방당 최대 1개, 선택적으로 활성화.
-- ============================================================
CREATE TABLE time_vote_sessions (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  room_id    BIGINT UNSIGNED NOT NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  is_active  TINYINT(1)      NOT NULL DEFAULT 1,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tvs_room (room_id),
  CONSTRAINT fk_tvs_room FOREIGN KEY (room_id)    REFERENCES meeting_rooms(id) ON DELETE CASCADE,
  CONSTRAINT fk_tvs_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- ============================================================
-- 10. time_vote_options
--     투표 시간대 선택지 (예: 12:00, 14:00, 18:00 ...).
-- ============================================================
CREATE TABLE time_vote_options (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  session_id BIGINT UNSIGNED NOT NULL,
  time_slot  TIME            NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tvo_slot (session_id, time_slot),
  CONSTRAINT fk_tvo_session FOREIGN KEY (session_id) REFERENCES time_vote_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 11. time_votes
--     참여자의 시간대 투표. 1인 1옵션 투표.
-- ============================================================
CREATE TABLE time_votes (
  id        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  option_id BIGINT UNSIGNED NOT NULL,
  user_id   BIGINT UNSIGNED NOT NULL,
  voted_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tv_option_user (option_id, user_id),
  CONSTRAINT fk_tv_option FOREIGN KEY (option_id) REFERENCES time_vote_options(id) ON DELETE CASCADE,
  CONSTRAINT fk_tv_user   FOREIGN KEY (user_id)   REFERENCES users(id)             ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 12. chat_messages
--     실시간 채팅. system 타입은 user_id가 NULL (입장/퇴장 알림 등).
-- ============================================================
CREATE TABLE chat_messages (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  room_id      BIGINT UNSIGNED NOT NULL,
  user_id      BIGINT UNSIGNED,                           -- NULL: 시스템 메시지
  content      TEXT            NOT NULL,
  message_type ENUM('text', 'image', 'system') NOT NULL DEFAULT 'text',
  is_deleted   TINYINT(1)      NOT NULL DEFAULT 0,
  created_at   DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),  -- 밀리초 정밀도
  PRIMARY KEY (id),
  INDEX idx_chat_room_time (room_id, created_at),
  CONSTRAINT fk_cm_room FOREIGN KEY (room_id) REFERENCES meeting_rooms(id) ON DELETE CASCADE,
  CONSTRAINT fk_cm_user FOREIGN KEY (user_id) REFERENCES users(id)         ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- MySQL Event Scheduler: 만료된 약속방 자동 파기 (매일 03:00 실행)
-- ============================================================
SET GLOBAL event_scheduler = ON;

CREATE EVENT IF NOT EXISTS evt_purge_expired_rooms
  ON SCHEDULE EVERY 1 DAY
  STARTS (DATE(NOW()) + INTERVAL 1 DAY + INTERVAL 3 HOUR)
  DO
    DELETE FROM meeting_rooms
    WHERE expires_at IS NOT NULL
      AND expires_at < NOW()
      AND status = 'confirmed';
