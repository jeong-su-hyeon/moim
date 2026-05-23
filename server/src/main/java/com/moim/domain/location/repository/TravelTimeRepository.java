package com.moim.domain.location.repository;

import com.moim.domain.location.entity.TransportMode;
import com.moim.domain.location.entity.TravelTime;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TravelTimeRepository extends JpaRepository<TravelTime, UUID> {
    Optional<TravelTime> findByPlaceIdAndUserIdAndTransport(UUID placeId, UUID userId, TransportMode transport);
    List<TravelTime> findByPlaceId(UUID placeId);

    @Modifying
    @Query("DELETE FROM TravelTime t WHERE t.place.id = :placeId")
    void deleteByPlaceId(@Param("placeId") UUID placeId);
}
