package com.sonny.exchangeservice.service;

import com.sonny.exchangeservice.dto.MarketSummaryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ExchangeService {

    public MarketSummaryResponse getMarketSummary() {
        return MarketSummaryResponse.builder()
                .usdKrw(1327.4)
                .usdKrwChangeRate(0.21)
                .kospi(2681.32)
                .kospiChangeRate(0.67)
                .kosdaq(782.14)
                .kosdaqChangeRate(-0.31)
                .nasdaq(18421.55)
                .nasdaqChangeRate(1.84)
                .fetchedDate(LocalDate.now().toString())
                .updatedAt(LocalDateTime.now().toString())
                .build();
    }
}
