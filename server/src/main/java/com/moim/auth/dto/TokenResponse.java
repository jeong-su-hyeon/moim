package com.moim.auth.dto;

import com.moim.domain.user.dto.UserResponse;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class TokenResponse {
    private final String accessToken;
    private final String tokenType = "Bearer";
    private final UserResponse user;
}
