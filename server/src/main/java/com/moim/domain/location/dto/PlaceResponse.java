package com.moim.domain.location.dto;

import com.moim.domain.location.entity.Place;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class PlaceResponse {

    private UUID id;
    private String name;
    private String address;
    private Double lat;
    private Double lng;
    private UUID registeredBy;
    private String registeredByName;
    private LocalDateTime createdAt;
    private long likeCount;
    private boolean likedByMe;

    public static PlaceResponse from(Place place) {
        return from(place, 0L, false);
    }

    public static PlaceResponse from(Place place, long likeCount, boolean likedByMe) {
        return PlaceResponse.builder()
            .id(place.getId())
            .name(place.getName())
            .address(place.getAddress())
            .lat(place.getLat())
            .lng(place.getLng())
            .registeredBy(place.getRegisteredBy().getId())
            .registeredByName(place.getRegisteredBy().getName())
            .createdAt(place.getCreatedAt())
            .likeCount(likeCount)
            .likedByMe(likedByMe)
            .build();
    }
}
