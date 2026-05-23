package com.moim.domain.user.dto;

import com.moim.domain.user.entity.OAuthProvider;
import com.moim.domain.user.entity.User;
import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
public class UserResponse {

    private UUID id;
    private String email;
    private String name;
    private String profileUrl;
    private OAuthProvider provider;

    public static UserResponse from(User user) {
        return UserResponse.builder()
            .id(user.getId())
            .email(user.getEmail())
            .name(user.getName())
            .profileUrl(user.getProfileUrl())
            .provider(user.getProvider())
            .build();
    }
}
