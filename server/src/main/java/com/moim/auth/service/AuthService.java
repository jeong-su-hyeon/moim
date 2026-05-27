package com.moim.auth.service;

import com.moim.auth.dto.LoginRequest;
import com.moim.auth.dto.SignupRequest;
import com.moim.auth.dto.TokenResponse;
import com.moim.domain.user.dto.UserResponse;
import com.moim.auth.entity.RefreshToken;
import com.moim.auth.jwt.JwtProperties;
import com.moim.auth.jwt.JwtProvider;
import com.moim.auth.repository.RefreshTokenRepository;
import com.moim.domain.user.entity.OAuthProvider;
import com.moim.domain.user.entity.User;
import com.moim.domain.user.repository.UserRepository;
import com.moim.global.exception.BusinessException;
import com.moim.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.servlet.http.HttpServletResponse;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtProvider jwtProvider;
    private final JwtProperties jwtProperties;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public TokenResponse signup(SignupRequest request, HttpServletResponse response) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BusinessException(ErrorCode.DUPLICATE_EMAIL);
        }
        User user = userRepository.save(User.builder()
            .email(request.getEmail())
            .passwordHash(passwordEncoder.encode(request.getPassword()))
            .name(request.getName())
            .provider(OAuthProvider.LOCAL)
            .build());

        return issueTokens(user, response);
    }

    @Transactional
    public TokenResponse login(LoginRequest request, HttpServletResponse response) {
        User user = userRepository.findByEmail(request.getEmail())
            .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_CREDENTIALS));

        // 소셜 가입 계정이거나 비밀번호 불일치 → 동일한 에러 메시지(정보 노출 방지)
        if (user.getPasswordHash() == null ||
                !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BusinessException(ErrorCode.INVALID_CREDENTIALS);
        }

        return issueTokens(user, response);
    }

    @Transactional
    public TokenResponse refresh(String rawRefreshToken, HttpServletResponse response) {
        if (!jwtProvider.isValid(rawRefreshToken)) {
            throw new BusinessException(ErrorCode.INVALID_TOKEN);
        }

        UUID userId = jwtProvider.extractUserId(rawRefreshToken);
        RefreshToken stored = refreshTokenRepository.findByUserId(userId)
            .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_TOKEN));

        if (stored.isExpired() || !passwordEncoder.matches(rawRefreshToken, stored.getTokenHash())) {
            refreshTokenRepository.delete(stored);   // 재사용 시도 → 즉시 폐기
            throw new BusinessException(ErrorCode.INVALID_TOKEN);
        }

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        // 토큰 로테이션: 사용한 Refresh Token 폐기 후 새 토큰 발급
        refreshTokenRepository.delete(stored);
        return issueTokens(user, response);
    }

    private TokenResponse issueTokens(User user, HttpServletResponse response) {
        String accessToken = jwtProvider.createAccessToken(user.getId());
        String rawRefresh  = jwtProvider.createRefreshToken(user.getId());

        // Refresh Token 해시 저장 (평문 저장 금지)
        refreshTokenRepository.save(RefreshToken.builder()
            .user(user)
            .tokenHash(passwordEncoder.encode(rawRefresh))
            .expiresAt(LocalDateTime.now().plusSeconds(jwtProperties.getRefreshExpiry()))
            .build());

        // Refresh Token → HttpOnly Secure 쿠키로만 내려보냄 (XSS 탈취 방지)
        ResponseCookie cookie = ResponseCookie.from("refresh_token", rawRefresh)
            .httpOnly(true)
            .secure(true)
            .sameSite("Strict")
            .path("/api/auth/refresh")
            .maxAge(jwtProperties.getRefreshExpiry())
            .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

        return new TokenResponse(accessToken, UserResponse.from(user));
    }
}
