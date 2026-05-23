package com.moim.auth.controller;

import com.moim.auth.dto.LoginRequest;
import com.moim.auth.dto.SignupRequest;
import com.moim.auth.dto.TokenResponse;
import com.moim.auth.service.AuthService;
import com.moim.global.response.ApiResponse;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<TokenResponse>> signup(
            @Valid @RequestBody SignupRequest request,
            HttpServletResponse response) {
        return ResponseEntity.ok(ApiResponse.ok(authService.signup(request, response)));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<TokenResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletResponse response) {
        return ResponseEntity.ok(ApiResponse.ok(authService.login(request, response)));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<TokenResponse>> refresh(
            @CookieValue(name = "refresh_token", required = false) String refreshToken,
            HttpServletResponse response) {
        if (refreshToken == null) {
            return ResponseEntity.status(401)
                .body(ApiResponse.error("INVALID_TOKEN", "Refresh token이 없습니다."));
        }
        return ResponseEntity.ok(ApiResponse.ok(authService.refresh(refreshToken, response)));
    }
}
