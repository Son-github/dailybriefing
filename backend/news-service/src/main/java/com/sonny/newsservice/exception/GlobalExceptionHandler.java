package com.sonny.newsservice.exception;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;

@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handle(Exception e) {
        return ResponseEntity.internalServerError().body(
                ErrorResponse.builder()
                        .timestamp(OffsetDateTime.now())
                        .message(e.getMessage())
                        .build()
        );
    }
}
