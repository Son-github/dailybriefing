package com.sonny.backend.domain.user.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserSignupRequestDto {
    private String email;
    private String password;
    private String location;
}
