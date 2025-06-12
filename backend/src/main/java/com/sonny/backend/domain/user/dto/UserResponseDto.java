package com.sonny.backend.domain.user.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.ZonedDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResponseDto {
    private Long userId;
    private String email;
    private String location;
    private ZonedDateTime createdAt;
    private ZonedDateTime lastLoginAt;
}
