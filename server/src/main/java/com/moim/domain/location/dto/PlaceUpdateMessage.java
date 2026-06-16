package com.moim.domain.location.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.UUID;

@Getter
@AllArgsConstructor
public class PlaceUpdateMessage {
    private String type; // "ADD" | "DELETE"
    private PlaceResponse place;
    private UUID placeId;

    public static PlaceUpdateMessage add(PlaceResponse place) {
        return new PlaceUpdateMessage("ADD", place, null);
    }

    public static PlaceUpdateMessage delete(UUID placeId) {
        return new PlaceUpdateMessage("DELETE", null, placeId);
    }
}
