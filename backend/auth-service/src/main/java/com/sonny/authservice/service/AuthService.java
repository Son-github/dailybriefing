package com.sonny.authservice.service;

import com.sonny.authservice.config.JwtTokenProvider;
import com.sonny.authservice.domain.User;
import com.sonny.authservice.domain.WeatherRegion;
import com.sonny.authservice.dto.MeResponse;
import com.sonny.authservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    @Transactional
    public void signup(String email, String rawPassword, String weatherRegionRaw) {
        String normalizedEmail = normalizeEmail(email); // 짧은 설명: 이메일 일관성 유지
        validatePassword(rawPassword); // 짧은 설명: 프론트 외에 백엔드에서도 최소 검증

        if (userRepository.findByEmail(normalizedEmail).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 가입된 이메일입니다.");
        }

        WeatherRegion region = parseRegion(weatherRegionRaw);

        User user = User.builder()
                .email(normalizedEmail)
                .password(passwordEncoder.encode(rawPassword.trim()))
                .weatherRegion(region)
                .build();

        userRepository.save(user);
    }

    @Transactional
    public LoginResult login(String email, String rawPassword) {
        String normalizedEmail = normalizeEmail(email); // 짧은 설명: 로그인 시도도 동일 규칙 적용

        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "이메일이 존재하지 않습니다."));

        if (rawPassword == null || rawPassword.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "비밀번호를 입력해 주세요.");
        }

        if (!passwordEncoder.matches(rawPassword, user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "비밀번호가 틀립니다.");
        }

        String accessToken = tokenProvider.generateAccessToken(normalizedEmail);
        String refreshToken = tokenProvider.generateRefreshToken(normalizedEmail);

        user.setRefreshToken(refreshToken);
        userRepository.save(user);

        return new LoginResult(accessToken, refreshToken);
    }

    @Transactional
    public void logout(String email) {
        String normalizedEmail = normalizeEmail(email);

        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유저 없음"));

        user.setRefreshToken(null); // 짧은 설명: 서버 저장 refresh token 무효화
    }

    @Transactional(readOnly = true)
    public String refreshAccessToken(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "리프레시 토큰이 없습니다.");
        }

        if (!tokenProvider.validateToken(refreshToken)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 리프레시 토큰입니다.");
        }

        String email = tokenProvider.getEmailFromToken(refreshToken);
        String normalizedEmail = normalizeEmail(email);

        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유저 없음"));

        if (user.getRefreshToken() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그아웃된 토큰입니다.");
        }

        if (!refreshToken.equals(user.getRefreshToken())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "위조되었거나 교체된 토큰입니다.");
        }

        return tokenProvider.generateAccessToken(normalizedEmail);
    }

    @Transactional(readOnly = true)
    public MeResponse me(String email) {
        String normalizedEmail = normalizeEmail(email);

        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유저 없음"));

        return new MeResponse(user.getEmail(), user.getWeatherRegion().name());
    }

    @Transactional
    public void updateWeatherRegion(String email, String weatherRegionRaw) {
        String normalizedEmail = normalizeEmail(email);

        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유저 없음"));

        user.setWeatherRegion(parseRegion(weatherRegionRaw));
    }

    @Transactional
    public void changePassword(String email, String currentPassword, String newPassword) {
        String normalizedEmail = normalizeEmail(email);
        validatePassword(newPassword); // 짧은 설명: 새 비밀번호 최소 검증

        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유저 없음"));

        if (currentPassword == null || currentPassword.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "현재 비밀번호를 입력해 주세요.");
        }

        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "현재 비밀번호가 일치하지 않습니다.");
        }

        user.setPassword(passwordEncoder.encode(newPassword.trim()));
        user.setRefreshToken(null); // 짧은 설명: 비밀번호 변경 시 기존 세션 무효화
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이메일을 입력해 주세요.");
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private void validatePassword(String rawPassword) {
        if (rawPassword == null || rawPassword.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "비밀번호를 입력해 주세요.");
        }

        if (rawPassword.trim().length() < 8) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "비밀번호는 8자 이상이어야 합니다.");
        }
    }

    private WeatherRegion parseRegion(String raw) {
        String v = Optional.ofNullable(raw).orElse("SEOUL").trim();
        if (v.isBlank()) v = "SEOUL";

        try {
            return WeatherRegion.valueOf(v.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "지원하지 않는 지역입니다.");
        }
    }

    public record LoginResult(String accessToken, String refreshToken) {}
}
