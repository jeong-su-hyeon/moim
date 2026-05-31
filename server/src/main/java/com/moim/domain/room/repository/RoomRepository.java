package com.moim.domain.room.repository;

import com.moim.domain.room.entity.Room;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RoomRepository extends JpaRepository<Room, UUID> {

    // 내가 참여 중인 방 목록 (최신순)
    @Query(value = "SELECT r.* FROM rooms r INNER JOIN room_participants rp ON rp.room_id = r.id WHERE rp.user_id = :userId ORDER BY r.created_at DESC", nativeQuery = true)
    List<Room> findAllByParticipantUserId(@Param("userId") UUID userId);

    // 동시 참가 레이스 컨디션 방지용 비관적 락
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Room r WHERE r.id = :id")
    Optional<Room> findByIdWithLock(@Param("id") UUID id);

    // 만료 방 일괄 삭제 (스케줄러용) — @Modifying 필수
    @Modifying
    @Query("DELETE FROM Room r WHERE r.expiresAt IS NOT NULL AND r.expiresAt < :now")
    void deleteExpiredRooms(@Param("now") LocalDateTime now);
}
