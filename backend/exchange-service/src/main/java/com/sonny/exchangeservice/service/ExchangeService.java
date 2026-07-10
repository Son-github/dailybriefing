package com.sonny.exchangeservice.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sonny.exchangeservice.dto.MarketSummaryResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExchangeService {

    private static final String CACHE_KEY = "dailybriefing:exchange:market-summary";
    private static final String LOCK_KEY = "dailybriefing:lock:exchange:market-summary";
    private static final Duration LOCK_TTL = Duration.ofSeconds(30);

    private final ExchangeApiService exchangeApiService;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    @Value("${app.data-refresh-ms:600000}")
    private long refreshMs;

    public MarketSummaryResponse getMarketSummary() {
        MarketSummaryResponse cached = readCached();
        if (cached != null) return cached;

        return refresh();
    }

    @Scheduled(fixedDelayString = "${app.data-refresh-ms:600000}", initialDelayString = "${app.data-refresh-ms:600000}")
    public void refreshScheduled() {
        refresh();
    }

    public synchronized MarketSummaryResponse refresh() {
        String lockToken = acquireLock();
        if (lockToken == null) {
            MarketSummaryResponse cached = waitForCached();
            if (cached != null) return cached;
        }

        try {
            MarketSummaryResponse previous = readCached();
            ExchangeApiService.MarketValue usd = exchangeApiService.getUsdKrw();
            ExchangeApiService.MarketValue kospi = exchangeApiService.getKospi();
            ExchangeApiService.MarketValue kosdaq = exchangeApiService.getKosdaq();
            ExchangeApiService.MarketValue nasdaq = exchangeApiService.getNasdaq();

            boolean allUnavailable = usd.value() == null && kospi.value() == null && kosdaq.value() == null && nasdaq.value() == null;
            if (allUnavailable && previous != null) {
                log.warn("All market providers failed; returning the previous cached response");
                MarketSummaryResponse stale = copyAsStale(previous);
                writeCached(stale);
                return stale;
            }

            LocalDateTime now = LocalDateTime.now();
            // 이전에는 화면 시연용 숫자를 하드코딩했다. 이제 공급자별 실패를 허용하고 실제 값만 조합한다.
            MarketSummaryResponse response = MarketSummaryResponse.builder()
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

            writeCached(response);
            return response;
        } finally {
            releaseLock(lockToken);
        }
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

    private MarketSummaryResponse readCached() {
        try {
            String value = redisTemplate.opsForValue().get(CACHE_KEY);
            if (value == null || value.isBlank()) return null;
            return objectMapper.readValue(value, MarketSummaryResponse.class);
        } catch (DataAccessException | JsonProcessingException e) {
            log.warn("Exchange Redis cache read failed: {}", e.getMessage());
            return null;
        }
    }

    private void writeCached(MarketSummaryResponse response) {
        try {
            redisTemplate.opsForValue().set(CACHE_KEY, objectMapper.writeValueAsString(response), Duration.ofMillis(refreshMs));
        } catch (DataAccessException | JsonProcessingException e) {
            log.warn("Exchange Redis cache write failed: {}", e.getMessage());
        }
    }

    private String acquireLock() {
        try {
            String token = UUID.randomUUID().toString();
            Boolean locked = redisTemplate.opsForValue().setIfAbsent(LOCK_KEY, token, LOCK_TTL);
            return Boolean.TRUE.equals(locked) ? token : null;
        } catch (DataAccessException e) {
            log.warn("Exchange Redis lock failed: {}", e.getMessage());
            return UUID.randomUUID().toString();
        }
    }

    private void releaseLock(String lockToken) {
        if (lockToken == null) return;
        try {
            if (lockToken.equals(redisTemplate.opsForValue().get(LOCK_KEY))) {
                redisTemplate.delete(LOCK_KEY);
            }
        } catch (DataAccessException e) {
            log.warn("Exchange Redis lock release failed: {}", e.getMessage());
        }
    }

    private MarketSummaryResponse waitForCached() {
        for (int i = 0; i < 5; i++) {
            try {
                Thread.sleep(200);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return null;
            }

            MarketSummaryResponse cached = readCached();
            if (cached != null) return cached;
        }
        return null;
    }
}
