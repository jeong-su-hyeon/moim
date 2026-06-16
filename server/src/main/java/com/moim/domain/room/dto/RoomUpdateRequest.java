package com.moim.domain.room.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class RoomUpdateRequest {

    @NotBlank(message = "방 이름은 필수입니다.")
    @Size(max = 200, message = "방 이름은 200자 이하여야 합니다.")
    private String title;
}
