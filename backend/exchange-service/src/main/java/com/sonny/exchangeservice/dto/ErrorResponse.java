package com.sonny.exchangeservice.dto;

public record ErrorResponse(String status, String message) {
    public static ErrorResponse of(String message) {
        return new ErrorResponse("error", message);
    }
}
