package com.sonny.authservice.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sonny.authservice.domain.User;
import com.sonny.authservice.dto.AuthRequest;
import com.sonny.authservice.repository.UserRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
    }

    @Test
    void 회원가입_성공() throws Exception {
        AuthRequest req = AuthRequest.builder().email("test@a.com").password("1111").build();
        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("회원가입 성공"));
    }

    @Test
    void 중복이메일_회원가입_실패() throws Exception {
        userRepository.save(User.builder().email("test@a.com").password(passwordEncoder.encode("1111")).build());
        AuthRequest req = AuthRequest.builder().email("test@a.com").password("2222").build();
        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("이미 가입된 이메일입니다."));
    }

    @Test
    void 로그인_성공() throws Exception {
        userRepository.save(User.builder().email("test@a.com").password(passwordEncoder.encode("1111")).build());
        AuthRequest req = AuthRequest.builder().email("test@a.com").password("1111").build();
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty());
    }

    @Test
    void 로그인_비밀번호틀림_실패() throws Exception {
        userRepository.save(User.builder().email("test@a.com").password(passwordEncoder.encode("1111")).build());
        AuthRequest req = AuthRequest.builder().email("test@a.com").password("9999").build();
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("비밀번호가 틀립니다."));
    }
}
