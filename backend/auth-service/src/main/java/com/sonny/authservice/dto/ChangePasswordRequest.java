package com.sonny.authservice.dto;

public record ChangePasswordRequest(String currentPassword, String newPassword) {}
