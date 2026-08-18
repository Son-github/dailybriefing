package com.sonny.authservice.controller;

import com.sonny.authservice.dto.AuthRequest;
import com.sonny.authservice.dto.AuthResponse;
import com.sonny.authservice.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@Tag(name = "인증 API", description = "회원가입/로그인/로그아웃")
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Operation(summary = "회원가입")
    @PostMapping("/signup")
    public ResponseEntity<AuthResponse> signup(@RequestBody AuthRequest request) {
        authService.signup(request.getEmail(), request.getPassword());
        return ResponseEntity.ok(AuthResponse.builder().message("회원가입 성공").build());
    }

    @Operation(summary = "로그인")
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody AuthRequest request) {
        String accessToken = authService.login(request.getEmail(), request.getPassword());
        return ResponseEntity.ok(AuthResponse.builder()
                .accessToken(accessToken)
                .tokenType("Bearer")
                .message("로그인 성공")
                .build());
    }

    @Operation(summary = "로그아웃")
    @PostMapping("/logout")
    public ResponseEntity<AuthResponse> logout(Authentication authentication) {
        return ResponseEntity.ok(AuthResponse.builder()
                .message(authentication.getName() + " 로그아웃 완료")
                .build());
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("OK");
    }
}
