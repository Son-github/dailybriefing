package com.sonny.authservice.controller;

import com.sonny.authservice.dto.AuthResponse;
import com.sonny.authservice.dto.UserLoginRequest;
import com.sonny.authservice.dto.UserSignupRequest;
import com.sonny.authservice.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody UserSignupRequest request) throws Exception {
        authService.signup(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new AuthResponse(null, "회원가입 성공"));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody UserLoginRequest request) throws Exception {
        String token = authService.login(request);
        return ResponseEntity.ok(new AuthResponse(token, "로그인 성공"));
    }
}
