package com.moim.config;

import com.moim.auth.jwt.JwtProvider;
import com.moim.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;

import org.springframework.stereotype.Component;

import java.security.Principal;
import java.util.UUID;

/**
 * Spring Security HTTP 필터체인은 WebSocket 핸드셰이크까지만 동작한다.
 * STOMP 프로토콜 레벨 메시지는 이 인터셉터에서 별도로 JWT를 검증해야 한다.
 * 이를 생략하면 토큰 없이 채팅방을 구독·발행할 수 있는 심각한 보안 취약점이 된다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtChannelInterceptor implements ChannelInterceptor {

    private final JwtProvider jwtProvider;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        // wrap() 대신 getAccessor() 사용 — 원본 메시지와 연결된 mutable accessor
        // wrap()은 메시지와 분리된 새 accessor를 만들어 setUser()가 세션에 반영되지 않음
        StompHeaderAccessor accessor =
            MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor == null) return message;

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");

            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                throw new IllegalStateException(ErrorCode.UNAUTHORIZED.getMessage());
            }

            String token = authHeader.substring(7);
            if (!jwtProvider.isValid(token)) {
                throw new IllegalStateException(ErrorCode.INVALID_TOKEN.getMessage());
            }

            UUID userId = jwtProvider.extractUserId(token);
            // STOMP 세션에 Principal 주입 → @MessageMapping에서 principal.getName()으로 userId 참조
            accessor.setUser(new Principal() {
                @Override public String getName() { return userId.toString(); }
            });

            log.debug("WebSocket CONNECT authenticated: userId={}", userId);
        }

        return message;
    }
}
