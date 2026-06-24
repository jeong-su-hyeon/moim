package com.moim.domain.room.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;

@Getter
public class RoomCreateRequest {

    @NotBlank(message = "방 제목은 필수입니다.")
    @Size(max = 200, message = "방 제목은 200자 이하여야 합니다.")
    private String title;

    @Min(value = 1, message = "최소 인원은 1명입니다.")
    @Max(value = 10, message = "최대 인원은 10명입니다.")
    private Integer maxParticipants;

    @NotBlank(message = "색상은 필수입니다.")
    private String color;
}
