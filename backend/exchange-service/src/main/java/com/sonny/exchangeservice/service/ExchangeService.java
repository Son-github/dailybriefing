package com.sonny.exchangeservice.service;

import com.sonny.exchangeservice.dto.MarketSummaryResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExchangeService {

    private final ExchangeApiService exchangeApiService;
    private volatile MarketSummaryResponse cached;
    private volatile LocalDateTime cachedAt;

    @Value("${app.data-refresh-ms:600000}")
    private long refreshMs;

    public MarketSummaryResponse getMarketSummary() {
        if (cached == null || cachedAt == null || cachedAt.plusNanos(refreshMs * 1_000_000).isBefore(LocalDateTime.now())) {
            refresh();
        }
        return cached;
    }

    @Scheduled(fixedDelayString = "${app.data-refresh-ms:600000}", initialDelayString = "${app.data-refresh-ms:600000}")
    public synchronized void refresh() {
        ExchangeApiService.MarketValue usd = exchangeApiService.getUsdKrw();
        ExchangeApiService.MarketValue kospi = exchangeApiService.getKospi();
        ExchangeApiService.MarketValue kosdaq = exchangeApiService.getKosdaq();
        ExchangeApiService.MarketValue nasdaq = exchangeApiService.getNasdaq();

        boolean allUnavailable = usd.value() == null && kospi.value() == null && kosdaq.value() == null && nasdaq.value() == null;
        if (allUnavailable && cached != null) {
            log.warn("All market providers failed; returning the previous cached response");
            cached = copyAsStale(cached);
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        // 이전에는 화면 시연용 숫자를 하드코딩했다. 이제 공급자별 실패를 허용하고 실제 값만 조합한다.
        cached = MarketSummaryResponse.builder()
                .usdKrw(usd.value())
                .usdKrwChangeRate(usd.changeRate())
                .kospi(kospi.value())
                .kospiChangeRate(kospi.changeRate())
                .kosdaq(kosdaq.value())
                .kosdaqChangeRate(kosdaq.changeRate())
                .nasdaq(nasdaq.value())
                .nasdaqChangeRate(nasdaq.changeRate())
                .fetchedDate(firstNonNull(usd.fetchedDate(), kospi.fetchedDate(), kosdaq.fetchedDate(), nasdaq.fetchedDate()))
                .updatedAt(now.toString())
                .stale(false)
                .build();
        cachedAt = now;
    }

    private MarketSummaryResponse copyAsStale(MarketSummaryResponse value) {
        return MarketSummaryResponse.builder()
                .usdKrw(value.getUsdKrw()).usdKrwChangeRate(value.getUsdKrwChangeRate())
                .kospi(value.getKospi()).kospiChangeRate(value.getKospiChangeRate())
                .kosdaq(value.getKosdaq()).kosdaqChangeRate(value.getKosdaqChangeRate())
                .nasdaq(value.getNasdaq()).nasdaqChangeRate(value.getNasdaqChangeRate())
                .fetchedDate(value.getFetchedDate()).updatedAt(value.getUpdatedAt()).stale(true)
                .build();
    }

    private String firstNonNull(String... values) {
        for (String value : values) {
            if (Objects.nonNull(value) && !value.isBlank()) return value;
        }
        return null;
    }
}
