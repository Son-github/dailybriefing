package com.sonny.exchangeservice.controller;

import com.sonny.exchangeservice.dto.MarketSummaryResponse;
import com.sonny.exchangeservice.service.ExchangeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/exchange")
@RequiredArgsConstructor
public class ExchangeController {

    private final ExchangeService exchangeService;

    @GetMapping
    public ResponseEntity<MarketSummaryResponse> getMarketSummary() {
        return ResponseEntity.ok(exchangeService.getMarketSummary());
    }
}
