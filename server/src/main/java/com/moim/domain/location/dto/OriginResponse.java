package com.moim.domain.location.dto;

import com.moim.domain.location.entity.UserOrigin;
import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
public class OriginResponse {

    private UUID userId;
    private String userName;
    private Double lat;
    private Double lng;
    private String label;

    public static OriginResponse from(UserOrigin origin) {
        return OriginResponse.builder()
            .userId(origin.getUser().getId())
            .userName(origin.getUser().getName())
            .lat(origin.getLat())
            .lng(origin.getLng())
            .label(origin.getLabel())
            .build();
    }
}
