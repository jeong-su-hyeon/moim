package com.moim.auth.oauth2;

import com.moim.auth.jwt.JwtProvider;
import com.moim.auth.jwt.JwtProperties;
import com.moim.auth.entity.RefreshToken;
import com.moim.auth.repository.RefreshTokenRepository;
import com.moim.domain.user.entity.User;
import com.moim.domain.user.repository.UserRepository;
import com.moim.global.exception.BusinessException;
import com.moim.global.exception.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtProvider jwtProvider;
    private final JwtProperties jwtProperties;
    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.front-url}")
    private String frontUrl;

    @Override
    @Transactional
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        OAuth2AuthenticationToken oauthToken = (OAuth2AuthenticationToken) authentication;
        DefaultOAuth2User oAuth2User = (DefaultOAuth2User) authentication.getPrincipal();
        String registrationId = oauthToken.getAuthorizedClientRegistrationId();
        UUID userId = UUID.fromString((String) oAuth2User.getAttributes().get("id"));

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        String accessToken  = jwtProvider.createAccessToken(userId);
        String rawRefresh   = jwtProvider.createRefreshToken(userId);

        // 기존 Refresh Token 교체 (토큰 로테이션)
        refreshTokenRepository.deleteByUserId(userId);
        refreshTokenRepository.save(RefreshToken.builder()
            .user(user)
            .tokenHash(passwordEncoder.encode(rawRefresh))
            .expiresAt(LocalDateTime.now().plusSeconds(jwtProperties.getRefreshExpiry()))
            .build());

        // Refresh Token → HttpOnly Secure 쿠키
        ResponseCookie refreshCookie = ResponseCookie.from("refresh_token", rawRefresh)
            .httpOnly(true)
            .secure(true)
            .sameSite("Lax")
            .path("/api/auth/refresh")
            .maxAge(jwtProperties.getRefreshExpiry())
            .build();
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());

        // Access Token → 프론트 URL 쿼리 파라미터 (짧은 수명이므로 허용)
        String redirectUrl = UriComponentsBuilder
            .fromUriString(frontUrl + "/auth/callback/" + registrationId)
            .queryParam("token", accessToken)
            .build().toUriString();

        getRedirectStrategy().sendRedirect(request, response, redirectUrl);
    }
}
