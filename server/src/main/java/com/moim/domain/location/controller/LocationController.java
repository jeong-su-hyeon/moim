package com.moim.domain.location.controller;

import com.moim.domain.location.dto.*;
import com.moim.domain.location.entity.TransportMode;
import com.moim.domain.location.service.LocationService;
import com.moim.domain.user.entity.User;
import com.moim.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/rooms/{roomId}")
@RequiredArgsConstructor
public class LocationController {

    private final LocationService locationService;

    @PostMapping("/origins")
    public ResponseEntity<ApiResponse<Void>> saveOrigin(
            @PathVariable UUID roomId,
            @Valid @RequestBody OriginRequest request,
            @AuthenticationPrincipal User user) {
        locationService.saveOrigin(roomId, request, user);
        return ResponseEntity.ok(ApiResponse.ok());
    }

    @GetMapping("/origins")
    public ResponseEntity<ApiResponse<List<OriginResponse>>> getOrigins(
            @PathVariable UUID roomId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.ok(locationService.getOrigins(roomId, user)));
    }

    @PostMapping("/places")
    public ResponseEntity<ApiResponse<PlaceResponse>> registerPlace(
            @PathVariable UUID roomId,
            @Valid @RequestBody PlaceRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.ok(locationService.registerPlace(roomId, request, user)));
    }

    @GetMapping("/places")
    public ResponseEntity<ApiResponse<List<PlaceResponse>>> getPlaces(
            @PathVariable UUID roomId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.ok(locationService.getPlaces(roomId, user)));
    }

    @DeleteMapping("/places/{placeId}")
    public ResponseEntity<ApiResponse<Void>> deletePlace(
            @PathVariable UUID roomId,
            @PathVariable UUID placeId,
            @AuthenticationPrincipal User user) {
        locationService.deletePlace(roomId, placeId, user);
        return ResponseEntity.ok(ApiResponse.ok());
    }

    @GetMapping("/places/{placeId}/travel-times")
    public ResponseEntity<ApiResponse<List<TravelTimeResponse>>> getTravelTimes(
            @PathVariable UUID roomId,
            @PathVariable UUID placeId,
            @RequestParam(defaultValue = "CAR") TransportMode transport,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.ok(locationService.getTravelTimes(roomId, placeId, transport, user)));
    }
}
