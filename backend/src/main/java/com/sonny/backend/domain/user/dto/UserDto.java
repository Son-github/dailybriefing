package com.sonny.backend.domain.user.dto;

import lombok.*;

import java.time.ZonedDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDto {
    private String email;
    private String password;
    private String location;
    private ZonedDateTime createdAt;
    private ZonedDateTime lastLoginAt;
}