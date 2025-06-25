package com.sonny.authservice.controller;

import com.sonny.authservice.dto.AuthResponse;
import com.sonny.authservice.dto.UserLoginRequest;
import com.sonny.authservice.dto.UserSignupRequest;
import com.sonny.authservice.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Auth API", description = "회원가입 및 로그인 API") // ← 이거 추가
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Operation(summary = "회원가입", description = "이메일과 비밀번호로 사용자 계정을 생성합니다.")
    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody UserSignupRequest request) throws Exception {
        authService.signup(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new AuthResponse(null, "회원가입 성공"));
    }

    @Operation(summary = "로그인", description = "이메일과 비밀번호로 로그인하고 JWT를 발급받습니다.")
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody UserLoginRequest request) throws Exception {
        String token = authService.login(request);
        return ResponseEntity.ok(new AuthResponse(token, "로그인 성공"));
    }
}
