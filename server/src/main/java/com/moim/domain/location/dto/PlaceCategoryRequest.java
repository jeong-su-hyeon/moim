package com.moim.domain.location.dto;

import com.moim.domain.location.entity.PlaceCategory;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;

@Getter
public class PlaceCategoryRequest {

    @NotNull(message = "카테고리는 필수입니다.")
    private PlaceCategory category;
}
