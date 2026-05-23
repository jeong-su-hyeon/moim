package com.moim.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * PasswordEncoder를 SecurityConfig에서 분리.
 *
 * SecurityConfig → OAuth2SuccessHandler → PasswordEncoder → (SecurityConfig 안에 정의)
 * 위 순환참조를 끊기 위해 PasswordEncoder를 독립 설정 클래스로 이동.
 */
@Configuration
public class PasswordEncoderConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
