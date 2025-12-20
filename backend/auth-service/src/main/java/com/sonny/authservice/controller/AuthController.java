package com.sonny.authservice.controller;

import com.sonny.authservice.domain.User;
import com.sonny.authservice.dto.AuthRequest;
import com.sonny.authservice.dto.AuthResponse;
import com.sonny.authservice.repository.UserRepository;
import com.sonny.authservice.config.JwtTokenProvider;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@Tag(name = "인증 API", description = "회원가입/로그인/토큰 리프레시")
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final PasswordEncoder passwordEncoder;
    private final UserRepository userRepository;
    private final JwtTokenProvider tokenProvider;

    @Operation(summary = "회원가입")
    @PostMapping("/signup")
    public ResponseEntity<AuthResponse> signup(@RequestBody AuthRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(AuthResponse.builder().message("이미 가입된 이메일입니다.").build());
        }
        User newUser = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .build();
        userRepository.save(newUser);
        return ResponseEntity.ok(AuthResponse.builder().message("회원가입 성공").build());
    }

    @Operation(summary = "로그인")
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody AuthRequest request, HttpServletResponse response) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("이메일이 존재하지 않습니다."));
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(AuthResponse.builder().message("비밀번호가 틀립니다.").build());
        }

        String accessToken = tokenProvider.generateAccessToken(request.getEmail());
        String refreshToken = tokenProvider.generateRefreshToken(request.getEmail());
        user.setRefreshToken(refreshToken);
        userRepository.save(user);

        ResponseCookie cookie = ResponseCookie.from("refreshToken", refreshToken)
                .httpOnly(true)
                .path("/")
                .maxAge(7 * 24 * 60 * 60)
                .sameSite("Strict")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

        return ResponseEntity.ok(AuthResponse.builder()
                .accessToken(accessToken)
                .tokenType("Bearer")
                .message("로그인 성공")
                .build());
    }

    @Operation(summary = "토큰 재발급")
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refreshToken(@CookieValue(value = "refreshToken", required = false) String refreshToken) {
        if (refreshToken == null || !tokenProvider.validateToken(refreshToken)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(AuthResponse.builder().message("토큰 없음 또는 유효하지 않음").build());
        }
        String email = tokenProvider.getEmailFromToken(refreshToken);
        User user = userRepository.findByEmail(email).orElseThrow();
        if (!refreshToken.equals(user.getRefreshToken())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(AuthResponse.builder().message("위조된 토큰").build());
        }
        String newAccessToken = tokenProvider.generateAccessToken(email);
        return ResponseEntity.ok(AuthResponse.builder()
                .accessToken(newAccessToken)
                .tokenType("Bearer")
                .message("재발급 완료")
                .build());
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("OK");
    }
}
