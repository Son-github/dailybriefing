package com.sonny.authservice.service;

import com.sonny.authservice.domain.User;
import com.sonny.authservice.dto.UserLoginRequest;
import com.sonny.authservice.dto.UserSignupRequest;
import com.sonny.authservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    public void signup(UserSignupRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            log.info("이미 존재하는 이메일입니다.");
            throw new UsernameNotFoundException("이미 존재하는 이메일입니다.");
        }

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role("ROLE_USER")
                .build();

        userRepository.save(user);
        log.info("{} 저장 완료!", user.getEmail());
    }

    public String login(UserLoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new UsernameNotFoundException("존재하지 않는 사용자입니다."));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new IllegalAccessException("비밀번호가 일치하지 않습니다.");
        }

        return jwtTokenProvider.generateToken(user.getEmail(), user.getRole());
    }
}
