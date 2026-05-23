package com.moim.domain.room.repository;

import com.moim.domain.room.entity.RoomParticipant;
import com.moim.domain.room.entity.RoomParticipantId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface RoomParticipantRepository extends JpaRepository<RoomParticipant, RoomParticipantId> {
    int countByIdRoomId(UUID roomId);
}
