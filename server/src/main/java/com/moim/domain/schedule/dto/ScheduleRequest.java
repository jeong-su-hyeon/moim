package com.moim.domain.schedule.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Getter;

import java.time.LocalDate;
import java.util.List;

@Getter
public class ScheduleRequest {

    @NotEmpty(message = "날짜를 하나 이상 선택해야 합니다.")
    @Size(max = 180, message = "최대 180일까지 선택할 수 있습니다.")
    private List<LocalDate> dates;
}
