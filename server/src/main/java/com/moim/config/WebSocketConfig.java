package com.moim.config;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtChannelInterceptor jwtChannelInterceptor;

    @Value("${app.front-url}")
    private String frontUrl;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // SockJS 폴백 엔드포인트 (레거시 호환용)
        registry.addEndpoint("/ws/chat")
            .setAllowedOrigins(frontUrl)
            .withSockJS();
        // 네이티브 WebSocket 엔드포인트 (프론트 Vite 프록시 경유)
        registry.addEndpoint("/ws/native")
            .setAllowedOrigins(frontUrl);
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic");
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // STOMP 메시지 수신 채널에 JWT 검증 인터셉터 등록
        registration.interceptors(jwtChannelInterceptor);
    }
}
