package com.moim.domain.schedule.repository;

import com.moim.domain.schedule.entity.Schedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ScheduleRepository extends JpaRepository<Schedule, UUID> {
    List<Schedule> findByRoomId(UUID roomId);

    List<Schedule> findByRoomIdAndUserId(UUID roomId, UUID userId);

    @Modifying
    @Query("DELETE FROM Schedule s WHERE s.room.id = :roomId AND s.user.id = :userId")
    void deleteByRoomIdAndUserId(@Param("roomId") UUID roomId, @Param("userId") UUID userId);
}
