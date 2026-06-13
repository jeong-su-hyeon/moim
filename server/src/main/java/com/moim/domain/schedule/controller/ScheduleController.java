package com.moim.domain.schedule.controller;

import com.moim.domain.schedule.dto.ScheduleRequest;
import com.moim.domain.schedule.service.ScheduleService;
import com.moim.domain.user.entity.User;
import com.moim.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/rooms/{roomId}/schedules")
@RequiredArgsConstructor
public class ScheduleController {

    private final ScheduleService scheduleService;

    @PostMapping
    public ResponseEntity<ApiResponse<Void>> saveSchedule(
            @PathVariable UUID roomId,
            @Valid @RequestBody ScheduleRequest request,
            @AuthenticationPrincipal User user) {
        scheduleService.saveSchedule(roomId, request, user);
        return ResponseEntity.ok(ApiResponse.ok());
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<List<LocalDate>>> getMySchedule(
            @PathVariable UUID roomId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.ok(scheduleService.getMyDates(roomId, user)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Map<LocalDate, List<String>>>> getSchedules(
            @PathVariable UUID roomId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.ok(scheduleService.getAggregated(roomId, user)));
    }
}
