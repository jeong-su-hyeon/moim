package com.moim.domain.room.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class JoinRoomRequest {

    @NotBlank(message = "색상은 필수입니다.")
    private String color;
}
