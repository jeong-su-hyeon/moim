package com.moim.auth.oauth2;

import com.moim.domain.user.entity.OAuthProvider;

import java.util.Map;

public class NaverOAuth2UserInfo implements OAuth2UserInfo {

    private final Map<String, Object> response;

    @SuppressWarnings("unchecked")
    public NaverOAuth2UserInfo(Map<String, Object> attributes) {
        this.response = (Map<String, Object>) attributes.getOrDefault("response", Map.of());
    }

    @Override public String getProviderId() { return (String) response.get("id"); }
    @Override public String getEmail()      { return (String) response.get("email"); }
    @Override public String getName()       { return (String) response.get("name"); }
    @Override public String getProfileUrl() { return (String) response.get("profile_image"); }
    @Override public OAuthProvider getProvider() { return OAuthProvider.NAVER; }
}
