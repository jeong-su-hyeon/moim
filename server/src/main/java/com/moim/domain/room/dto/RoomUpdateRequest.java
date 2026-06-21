package com.moim.domain.room.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class RoomUpdateRequest {

    @Size(max = 200, message = "방 이름은 200자 이하여야 합니다.")
    private String title;

    @Min(value = 1, message = "최소 인원은 1명입니다.")
    @Max(value = 10, message = "최대 인원은 10명입니다.")
    private Integer maxParticipants;
}
