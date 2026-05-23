package com.moim.auth.oauth2;

import com.moim.domain.user.entity.OAuthProvider;

public interface OAuth2UserInfo {
    String getProviderId();
    String getEmail();
    String getName();
    String getProfileUrl();
    OAuthProvider getProvider();
}
