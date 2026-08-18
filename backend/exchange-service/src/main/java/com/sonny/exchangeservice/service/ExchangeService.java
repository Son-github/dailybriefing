package com.sonny.exchangeservice.service;

import com.sonny.exchangeservice.dto.MarketSummaryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class ExchangeService {

    private final ExchangeApiService exchangeApiService;

    public MarketSummaryResponse getMarketSummary() {
        ExchangeApiService.MarketValue usd = exchangeApiService.getUsdKrw();
        ExchangeApiService.MarketValue kospi = exchangeApiService.getKospi();
        ExchangeApiService.MarketValue kosdaq = exchangeApiService.getKosdaq();
        ExchangeApiService.MarketValue nasdaq = exchangeApiService.getNasdaq();

        return MarketSummaryResponse.builder()
                .usdKrw(usd.value())
                .usdKrwChangeRate(usd.changeRate())
                .kospi(kospi.value())
                .kospiChangeRate(kospi.changeRate())
                .kosdaq(kosdaq.value())
                .kosdaqChangeRate(kosdaq.changeRate())
                .nasdaq(nasdaq.value())
                .nasdaqChangeRate(nasdaq.changeRate())
                .fetchedDate(firstNonNull(usd.fetchedDate(), kospi.fetchedDate(), kosdaq.fetchedDate(), nasdaq.fetchedDate()))
                .updatedAt(LocalDateTime.now().toString())
                .stale(false)
                .build();
    }

    private String firstNonNull(String... values) {
        for (String value : values) {
            if (Objects.nonNull(value) && !value.isBlank()) return value;
        }
        return null;
    }
}
