package com.sonny.backend.domain.user.dto;

import lombok.*;

import java.time.ZonedDateTime;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ApiLogDto {
    private String apiName;
    private Integer statusCode;
    private Integer responseTimesMs;
    private ZonedDateTime calledAt;
    private String errorMessage;
}
