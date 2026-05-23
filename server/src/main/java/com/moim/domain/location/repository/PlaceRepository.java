package com.moim.domain.location.repository;

import com.moim.domain.location.entity.Place;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PlaceRepository extends JpaRepository<Place, UUID> {
    List<Place> findByRoomId(UUID roomId);
}
