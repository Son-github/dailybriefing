package com.sonny.exchangeservice.dto;

public record ApiResponse<T>(String status, T data) {
    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<T>("success", data);
    }
}

// 무엇?