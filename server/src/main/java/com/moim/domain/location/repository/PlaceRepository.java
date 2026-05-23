package com.moim.domain.location.repository;

import com.moim.domain.location.entity.Place;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PlaceRepository extends JpaRepository<Place, UUID> {
    List<Place> findByRoomId(UUID roomId);

    // IDOR 방지: place가 해당 room 소속인지 한 번의 쿼리로 검증
    @Query("SELECT p FROM Place p WHERE p.id = :id AND p.room.id = :roomId")
    Optional<Place> findByIdAndRoomId(@Param("id") UUID id, @Param("roomId") UUID roomId);
}
