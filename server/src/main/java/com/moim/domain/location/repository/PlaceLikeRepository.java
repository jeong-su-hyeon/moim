package com.moim.domain.location.repository;

import com.moim.domain.location.entity.PlaceLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface PlaceLikeRepository extends JpaRepository<PlaceLike, UUID> {

    boolean existsByPlaceIdAndUserId(UUID placeId, UUID userId);

    void deleteByPlaceIdAndUserId(UUID placeId, UUID userId);

    long countByPlaceId(UUID placeId);

    void deleteByPlaceId(UUID placeId);

    @Query("SELECT pl.user.id FROM PlaceLike pl WHERE pl.place.id = :placeId")
    List<UUID> findUserIdsByPlaceId(UUID placeId);
}
