package com.sonny.authservice.service;

import com.sonny.authservice.domain.User;
import com.sonny.authservice.repository.UserRepository;
import com.sonny.authservice.config.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    public void signup(String email, String rawPassword) {
        if (userRepository.findByEmail(email).isPresent()) {
            throw new IllegalArgumentException("이미 가입된 이메일입니다.");
        }
        User user = User.builder()
                .email(email)
                .password(passwordEncoder.encode(rawPassword))
                .build();
        userRepository.save(user);
    }

    public String generateAccessToken(String email) {
        return tokenProvider.generateAccessToken(email);
    }

    public String generateRefreshToken(String email) {
        return tokenProvider.generateRefreshToken(email);
    }

    public void saveRefreshToken(String email, String refreshToken) {
        User user = userRepository.findByEmail(email).orElseThrow();
        user.setRefreshToken(refreshToken);
        userRepository.save(user);
    }

    public boolean isValidRefreshToken(String token) {
        if (!tokenProvider.validateToken(token)) return false;
        String email = tokenProvider.getEmailFromToken(token);
        User user = userRepository.findByEmail(email).orElse(null);
        return user != null && token.equals(user.getRefreshToken());
    }

    public String extractEmailFromToken(String token) {
        return tokenProvider.getEmailFromToken(token);
    }
}

