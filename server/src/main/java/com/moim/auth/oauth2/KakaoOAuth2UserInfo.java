package com.moim.auth.oauth2;

import com.moim.domain.user.entity.OAuthProvider;

import java.util.Map;

public class KakaoOAuth2UserInfo implements OAuth2UserInfo {

    private final Map<String, Object> attributes;
    private final Map<String, Object> kakaoAccount;
    private final Map<String, Object> profile;

    @SuppressWarnings("unchecked")
    public KakaoOAuth2UserInfo(Map<String, Object> attributes) {
        this.attributes = attributes;
        this.kakaoAccount = (Map<String, Object>) attributes.getOrDefault("kakao_account", Map.of());
        this.profile = (Map<String, Object>) kakaoAccount.getOrDefault("profile", Map.of());
    }

    @Override public String getProviderId() { return String.valueOf(attributes.get("id")); }
    @Override public String getEmail()      { return (String) kakaoAccount.get("email"); }
    @Override public String getName()       { return (String) profile.get("nickname"); }
    @Override public String getProfileUrl() { return (String) profile.get("profile_image_url"); }
    @Override public OAuthProvider getProvider() { return OAuthProvider.KAKAO; }
}
