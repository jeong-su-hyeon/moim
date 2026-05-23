package com.moim.domain.room.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;

import java.time.LocalDate;
import java.util.UUID;

@Getter
public class ConfirmRequest {

    @NotNull(message = "확정 날짜는 필수입니다.")
    private LocalDate date;

    private UUID placeId; // 장소 미확정 시 null 허용
}
