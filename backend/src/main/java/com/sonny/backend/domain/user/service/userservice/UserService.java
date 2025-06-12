package com.sonny.backend.domain.user.service.userservice;

import com.sonny.backend.domain.user.domain.User;
import com.sonny.backend.domain.user.dto.UserLoginRequestDto;
import com.sonny.backend.domain.user.dto.UserLoginResponseDto;
import com.sonny.backend.domain.user.dto.UserSignupRequestDto;
import com.sonny.backend.domain.user.repository.UserRepository;
import com.sonny.backend.global.jwt.JwtProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.ZonedDateTime;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder; // SecurityConfig 필요함.
    private final JwtProvider jwtProvider;

    /* 확인해봐야할 것
     *  1. RuntimeException 모아서 쉽게 수정
     *  2. userResponseDto를 할 때, 어떤 정보들 가져와줄껀지 결정
     *  3. 보안 측면 더 올리기
     *  4. userRepository를 활용해서 save할 때, lastLoginAt만 update하면 되지 않은지?*/
    public boolean signup(UserSignupRequestDto dto) {
        if (userRepository.findByEmail(dto.getEmail()).isPresent()) {
            throw new RuntimeException("Email Already Exists");
        }

        User user = User.builder()
                .email(dto.getEmail())
                .password(passwordEncoder.encode(dto.getPassword()))
                .location(dto.getLocation())
                .createdAt(ZonedDateTime.now())
                .build();

        User saved = userRepository.save(user);

        return true;
    }

    /* 확인해봐야할 것
    *  1. RuntimeException 모아서 쉽게 수정
    *  2. userResponseDto를 할 때, 어떤 정보들 가져와줄껀지 결정
    *  3. 보안 측면 더 올리기
    *  4. userRepository를 활용해서 save할 때, lastLoginAt만 update하면 되지 않은지?*/
    public UserLoginResponseDto login(UserLoginRequestDto dto) {
        User user = userRepository.findByEmail(dto.getEmail())
                .orElseThrow(() -> new RuntimeException("Email Not Found"));

        if (!passwordEncoder.matches(dto.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid credentials");
        }

        user.setLastLoginAt(ZonedDateTime.now());
        userRepository.save(user);

        String token = jwtProvider.generateToken(user.getEmail());

        return new UserLoginResponseDto(token, user.getEmail(), user.getLocation());
    }
}
