package com.moim.auth.jwt;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtProvider {

    private final JwtProperties jwtProperties;
    private SecretKey key;

    @PostConstruct
    public void init() {
        byte[] keyBytes = jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8);
        // HS256은 최소 256비트(32바이트) 키 필요 — 애플리케이션 시작 시 강제 검증
        if (keyBytes.length < 32) {
            throw new IllegalStateException(
                "JWT_SECRET must be at least 32 characters (256 bits). Current: " + keyBytes.length + " bytes");
        }
        this.key = Keys.hmacShaKeyFor(keyBytes);
    }

    public String createAccessToken(UUID userId) {
        return buildToken(userId.toString(), jwtProperties.getAccessExpiry() * 1000L);
    }

    public String createRefreshToken(UUID userId) {
        return buildToken(userId.toString(), jwtProperties.getRefreshExpiry() * 1000L);
    }

    private String buildToken(String subject, long expiryMs) {
        Date now = new Date();
        return Jwts.builder()
            .subject(subject)
            .issuedAt(now)
            .expiration(new Date(now.getTime() + expiryMs))
            .signWith(key)
            .compact();
    }

    public UUID extractUserId(String token) {
        return UUID.fromString(parseClaims(token).getSubject());
    }

    public boolean isValid(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (ExpiredJwtException e) {
            log.debug("Expired JWT");
        } catch (JwtException | IllegalArgumentException e) {
            log.debug("Invalid JWT: {}", e.getMessage());
        }
        return false;
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
            .verifyWith(key)
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }
}
