package com.moim.domain.location.dto;

import com.moim.domain.location.entity.TransportMode;
import com.moim.domain.location.entity.TravelTime;
import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
public class TravelTimeResponse {

    private UUID userId;
    private String userName;
    private TransportMode transport;
    private int durationMin;

    public static TravelTimeResponse from(TravelTime travelTime) {
        return TravelTimeResponse.builder()
            .userId(travelTime.getUser().getId())
            .userName(travelTime.getUser().getName())
            .transport(travelTime.getTransport())
            .durationMin(travelTime.getDurationMin())
            .build();
    }
}
