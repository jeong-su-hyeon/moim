-- ShedLock은 JPA 엔티티가 아니라 Hibernate가 자동 생성 못 함
-- 서버 첫 실행 전에 PostgreSQL에서 한 번만 실행하면 됨

CREATE TABLE IF NOT EXISTS shedlock (
    name       VARCHAR(64)  NOT NULL,
    lock_until TIMESTAMP    NOT NULL,
    locked_at  TIMESTAMP    NOT NULL,
    locked_by  VARCHAR(255) NOT NULL,
    PRIMARY KEY (name)
);
