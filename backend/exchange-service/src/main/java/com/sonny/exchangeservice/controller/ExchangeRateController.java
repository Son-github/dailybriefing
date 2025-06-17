package com.sonny.exchangeservice.controller;

import com.sonny.exchangeservice.dto.ApiResponse;
import com.sonny.exchangeservice.dto.ExchangeRateDto;
import com.sonny.exchangeservice.service.ExchangeRateService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard/exchange")
public class ExchangeRateController {

    private final ExchangeRateService exchangeRateService;

    public ExchangeRateController(ExchangeRateService exchangeRateService) {
        this.exchangeRateService = exchangeRateService;
    }

    @GetMapping("/{base}")
    public ResponseEntity<ApiResponse<ExchangeRateDto>> getRate(@PathVariable String base) {
        return ResponseEntity.ok(ApiResponse.success(exchangeRateService.getLatestRate(base)));
    }
}

