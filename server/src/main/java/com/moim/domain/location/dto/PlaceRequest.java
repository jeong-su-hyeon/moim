package com.moim.domain.location.dto;

import com.moim.domain.location.entity.PlaceCategory;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;

@Getter
public class PlaceRequest {

    @NotBlank(message = "장소명은 필수입니다.")
    @Size(max = 200, message = "장소명은 200자 이하이어야 합니다.")
    private String name;

    @Size(max = 500, message = "주소는 500자 이하이어야 합니다.")
    private String address;

    @NotNull(message = "위도는 필수입니다.")
    @DecimalMin(value = "-90.0", message = "위도는 -90 이상이어야 합니다.")
    @DecimalMax(value = "90.0",  message = "위도는 90 이하이어야 합니다.")
    private Double lat;

    @NotNull(message = "경도는 필수입니다.")
    @DecimalMin(value = "-180.0", message = "경도는 -180 이상이어야 합니다.")
    @DecimalMax(value = "180.0",  message = "경도는 180 이하이어야 합니다.")
    private Double lng;

    private PlaceCategory category;
}
