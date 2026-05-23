package com.moim.domain.room.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;

@Getter
public class RoomCreateRequest {

    @NotBlank(message = "방 제목은 필수입니다.")
    @Size(max = 200, message = "방 제목은 200자 이하여야 합니다.")
    private String title;
}
