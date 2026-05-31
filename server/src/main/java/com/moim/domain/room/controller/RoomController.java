package com.moim.domain.room.controller;

import com.moim.domain.room.dto.ConfirmRequest;
import com.moim.domain.room.dto.RoomCreateRequest;
import com.moim.domain.room.dto.RoomResponse;
import com.moim.domain.room.service.RoomService;
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
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final RoomService roomService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<RoomResponse>>> getMyRooms(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.ok(roomService.getMyRooms(user)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<RoomResponse>> createRoom(
            @Valid @RequestBody RoomCreateRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.ok(roomService.createRoom(request, user)));
    }

    @GetMapping("/{roomId}")
    public ResponseEntity<ApiResponse<RoomResponse>> getRoom(@PathVariable UUID roomId) {
        return ResponseEntity.ok(ApiResponse.ok(roomService.getRoom(roomId)));
    }

    @PostMapping("/{roomId}/join")
    public ResponseEntity<ApiResponse<Void>> joinRoom(
            @PathVariable UUID roomId,
            @AuthenticationPrincipal User user) {
        roomService.joinRoom(roomId, user);
        return ResponseEntity.ok(ApiResponse.ok());
    }

    @DeleteMapping("/{roomId}")
    public ResponseEntity<ApiResponse<Void>> deleteRoom(
            @PathVariable UUID roomId,
            @AuthenticationPrincipal User user) {
        roomService.deleteRoom(roomId, user);
        return ResponseEntity.ok(ApiResponse.ok());
    }

    @PostMapping("/{roomId}/confirm")
    public ResponseEntity<ApiResponse<RoomResponse>> confirmRoom(
            @PathVariable UUID roomId,
            @Valid @RequestBody ConfirmRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.ok(roomService.confirmRoom(roomId, request, user)));
    }

    @GetMapping("/{roomId}/result")
    public ResponseEntity<ApiResponse<RoomResponse>> getResult(@PathVariable UUID roomId) {
        return ResponseEntity.ok(ApiResponse.ok(roomService.getResult(roomId)));
    }
}
