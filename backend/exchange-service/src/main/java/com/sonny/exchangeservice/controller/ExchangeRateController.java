package com.sonny.exchangeservice.controller;

import com.sonny.exchangeservice.dto.ApiResponse;
import com.sonny.exchangeservice.dto.ErrorResponse;
import com.sonny.exchangeservice.dto.ExchangeRateDto;
import com.sonny.exchangeservice.service.ExchangeRateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard/exchange")
@RequiredArgsConstructor
public class ExchangeRateController {

    private final ExchangeRateService exchangeRateService;

    @GetMapping("/{base}")
    public ResponseEntity<?> getRate(@PathVariable String base) {
        try {
            ExchangeRateDto dto = exchangeRateService.getLatestRate(base);
            return ResponseEntity.ok(ApiResponse.success(dto));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ErrorResponse.of(e.getMessage()));
        }
    }
}

