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

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    @Transactional
    public void signup(String email, String rawPassword, String weatherRegionRaw) {
        if (userRepository.findByEmail(email).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 가입된 이메일입니다.");
        }

        WeatherRegion region = parseRegion(weatherRegionRaw);

        User user = User.builder()
                .email(email)
                .password(passwordEncoder.encode(rawPassword))
                .weatherRegion(region)
                .build();

        userRepository.save(user);
    }

    @Transactional
    public LoginResult login(String email, String rawPassword) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "이메일이 존재하지 않습니다."));

        if (!passwordEncoder.matches(rawPassword, user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "비밀번호가 틀립니다.");
        }

        String accessToken = tokenProvider.generateAccessToken(email);
        String refreshToken = tokenProvider.generateRefreshToken(email);

        user.setRefreshToken(refreshToken);
        userRepository.save(user);

        return new LoginResult(accessToken, refreshToken);
    }


    @Transactional
    public void logout(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유저 없음"));

        // ✅ refreshToken 서버 저장값 무효화
        user.setRefreshToken(null);
    }

    @Transactional(readOnly = true)
    public String refreshAccessToken(String refreshToken) {
        if (refreshToken == null || !tokenProvider.validateToken(refreshToken)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "토큰 없음 또는 유효하지 않음");
        }

        String email = tokenProvider.getEmailFromToken(refreshToken);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유저 없음"));

        if (!refreshToken.equals(user.getRefreshToken())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "위조된 토큰");
        }

        return tokenProvider.generateAccessToken(email);
    }

    // ====== MyPage ======

    @Transactional(readOnly = true)
    public MeResponse me(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유저 없음"));
        return new MeResponse(user.getEmail(), user.getWeatherRegion().name());
    }

    @Transactional
    public void updateWeatherRegion(String email, String weatherRegionRaw) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유저 없음"));
        user.setWeatherRegion(parseRegion(weatherRegionRaw));
    }

    @Transactional
    public void changePassword(String email, String currentPassword, String newPassword) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유저 없음"));

        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "현재 비밀번호가 일치하지 않습니다.");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
    }

    private WeatherRegion parseRegion(String raw) {
        String v = Optional.ofNullable(raw).orElse("SEOUL").trim();
        if (v.isBlank()) v = "SEOUL";
        return WeatherRegion.valueOf(v.toUpperCase());
    }

    public record LoginResult(String accessToken, String refreshToken) {}
}
