package com.sonny.newsservice.exception;

import lombok.*;

import java.time.OffsetDateTime;

@Getter
@AllArgsConstructor
@Builder
public class ErrorResponse {
    private OffsetDateTime timestamp;
    private String message;
}
