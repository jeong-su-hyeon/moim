package com.moim.domain.location.repository;

import com.moim.domain.location.entity.UserOrigin;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserOriginRepository extends JpaRepository<UserOrigin, UUID> {
    Optional<UserOrigin> findByRoomIdAndUserId(UUID roomId, UUID userId);
    List<UserOrigin> findByRoomId(UUID roomId);
}
