package com.moim.domain.room.dto;

import com.moim.domain.location.entity.Place;
import com.moim.domain.room.entity.Room;
import com.moim.domain.room.entity.RoomStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Builder
public class RoomResponse {

    private UUID id;
    private String title;
    private UUID hostId;
    private String hostName;
    private RoomStatus status;
    private LocalDate confirmedDate;
    private ConfirmedPlaceInfo confirmedPlace;
    private int participantCount;
    private List<ParticipantInfo> participants;
    private LocalDateTime createdAt;

    public static RoomResponse from(Room room) {
        Place place = room.getConfirmedPlace();
        return RoomResponse.builder()
            .id(room.getId())
            .title(room.getTitle())
            .hostId(room.getHost().getId())
            .hostName(room.getHost().getName())
            .status(room.getStatus())
            .confirmedDate(room.getConfirmedDate())
            .confirmedPlace(place != null ? ConfirmedPlaceInfo.from(place) : null)
            .participantCount(room.getParticipantCount())
            .participants(room.getParticipants().stream()
                .map(p -> new ParticipantInfo(p.getUser().getId(), p.getUser().getName()))
                .toList())
            .createdAt(room.getCreatedAt())
            .build();
    }

    public record ParticipantInfo(UUID id, String name) {}

    public record ConfirmedPlaceInfo(UUID id, String name, String address, Double lat, Double lng) {
        static ConfirmedPlaceInfo from(Place place) {
            return new ConfirmedPlaceInfo(place.getId(), place.getName(), place.getAddress(), place.getLat(), place.getLng());
        }
    }
}
