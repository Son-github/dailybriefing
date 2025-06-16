package com.sonny.authservice.dto;

import lombok.Data;

@Data
public class UserSignupRequest {
    private String email;
    private String password;
}
