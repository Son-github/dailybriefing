package com.sonny.authservice.controller;

import com.sonny.authservice.dto.*;
import com.sonny.authservice.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@Tag(name = "인증 API", description = "회원가입/로그인/토큰 리프레시/마이페이지")
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Operation(summary = "회원가입")
    @PostMapping("/signup")
    public ResponseEntity<AuthResponse> signup(@RequestBody AuthRequest request) {
        authService.signup(request.getEmail(), request.getPassword(), request.getWeatherRegion());
        return ResponseEntity.ok(AuthResponse.builder().message("회원가입 성공").build());
    }

    @Operation(summary = "로그인")
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody AuthRequest request, HttpServletResponse response) {
        AuthService.LoginResult result = authService.login(request.getEmail(), request.getPassword());

        ResponseCookie cookie = ResponseCookie.from("refreshToken", result.refreshToken())
                .httpOnly(true)
                .path("/")
                .maxAge(7 * 24 * 60 * 60)
                .sameSite("Strict")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

        return ResponseEntity.ok(AuthResponse.builder()
                .accessToken(result.accessToken())
                .tokenType("Bearer")
                .message("로그인 성공")
                .build());
    }

    @Operation(summary = "로그아웃")
    @PostMapping("/logout")
    public ResponseEntity<AuthResponse> logout(Authentication authentication, HttpServletResponse response) {
        // ✅ 인증된 사용자만 로그아웃 (Authentication.getName() = email)
        String email = authentication.getName();
        authService.logout(email);

        // ✅ refreshToken 쿠키 삭제
        ResponseCookie deleteCookie = ResponseCookie.from("refreshToken", "")
                .httpOnly(true)
                .path("/")
                .maxAge(0)
                .sameSite("Strict")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, deleteCookie.toString());

        return ResponseEntity.ok(AuthResponse.builder()
                .message("로그아웃 완료")
                .build());
    }

    @Operation(summary = "토큰 재발급")
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refreshToken(
            @CookieValue(value = "refreshToken", required = false) String refreshToken
    ) {
        String newAccessToken = authService.refreshAccessToken(refreshToken);
        return ResponseEntity.ok(AuthResponse.builder()
                .accessToken(newAccessToken)
                .tokenType("Bearer")
                .message("재발급 완료")
                .build());
    }

    // ====== MyPage ======
    // 아래 3개는 Security 설정상 인증 필요(Authorization Bearer token)

    @GetMapping("/me")
    public MeResponse me(Authentication authentication) {
        String email = authentication.getName();
        return authService.me(email);
    }

    @PutMapping("/me/weather-region")
    public ResponseEntity<Void> updateWeatherRegion(
            Authentication authentication,
            @RequestBody UpdateWeatherRegionRequest req
    ) {
        authService.updateWeatherRegion(authentication.getName(), req.weatherRegion());
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/me/password")
    public ResponseEntity<Void> changePassword(
            Authentication authentication,
            @RequestBody ChangePasswordRequest req
    ) {
        authService.changePassword(authentication.getName(), req.currentPassword(), req.newPassword());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("OK");
    }
}
