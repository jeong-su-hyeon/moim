package com.moim.auth.oauth2;

import com.moim.domain.user.entity.User;
import com.moim.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);
        String registrationId = userRequest.getClientRegistration().getRegistrationId();

        OAuth2UserInfo userInfo = switch (registrationId) {
            case "google" -> new GoogleOAuth2UserInfo(oAuth2User.getAttributes());
            case "kakao"  -> new KakaoOAuth2UserInfo(oAuth2User.getAttributes());
            case "naver"  -> new NaverOAuth2UserInfo(oAuth2User.getAttributes());
            default       -> throw new OAuth2AuthenticationException("Unsupported provider: " + registrationId);
        };

        User user = userRepository.findByProviderAndProviderId(userInfo.getProvider(), userInfo.getProviderId())
            .orElseGet(() -> {
                if (userRepository.findByEmail(userInfo.getEmail()).isPresent()) {
                    throw new OAuth2AuthenticationException(
                        "이미 다른 방식으로 가입된 이메일입니다: " + userInfo.getEmail());
                }
                return userRepository.save(
                    User.builder()
                        .email(userInfo.getEmail())
                        .name(userInfo.getName())
                        .profileUrl(userInfo.getProfileUrl())
                        .provider(userInfo.getProvider())
                        .providerId(userInfo.getProviderId())
                        .build()
                );
            });

        return new DefaultOAuth2User(List.of(),
            Map.of("id", user.getId().toString(),
                   "email", user.getEmail(),
                   "name",  user.getName()),
            "id");
    }
}
