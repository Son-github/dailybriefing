package com.sonny.exchangeservice.service;

import com.sonny.exchangeservice.domain.ExchangeLastSeen;
import com.sonny.exchangeservice.domain.ExchangeRate;
import com.sonny.exchangeservice.dto.ExchangeRateDto;
import com.sonny.exchangeservice.dto.ExchangeResponseDto;
import com.sonny.exchangeservice.repository.ExchangeLastSeenRepository;
import com.sonny.exchangeservice.repository.ExchangeRateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ExchangeRateService {

    private final WebClient webClient;
    private final ExchangeRateRepository repository;
    private final ExchangeLastSeenRepository lastSeenRepository;

    @Value("${external.exchange.service-key}")
    private String serviceKey;

    @Value("${exchange.cache-ttl-seconds:60}")
    private long cacheTtlSeconds;

    // ====== public API ======

    /**
     * ✅ "거의 실시간" 최신 환율 + 유저 마지막 조회 대비 증감
     */
    @Transactional
    public ExchangeRateDto getLatestRateWithLastSeen(String userId) {
        ExchangeRateDto current = getLatestRateFresh(); // ✅ TTL 기반

        var lastOpt = lastSeenRepository.findByUserIdAndBaseCurrencyAndTargetCurrency(
                userId, current.baseCurrency(), current.targetCurrency()
        );

        Double delta = null;
        LocalDateTime lastSeenAt = null;

        if (lastOpt.isPresent()) {
            ExchangeLastSeen last = lastOpt.get();
            delta = current.rate() - last.getLastSeenRate();
            lastSeenAt = last.getLastSeenAt();
        }

        // ✅ 이번 조회값을 "lastSeen"으로 저장
        ExchangeLastSeen toSave = ExchangeLastSeen.builder()
                .userId(userId)
                .baseCurrency(current.baseCurrency())
                .targetCurrency(current.targetCurrency())
                .lastSeenRate(current.rate())
                .lastSeenAt(LocalDateTime.now())
                // fetchedDate는 더 이상 "오늘"이 아니라, current.fetchedAt 기준 날짜로 저장
                .lastFetchedDate(LocalDate.parse(current.fetchedDate()))
                .build();

        lastSeenRepository.save(toSave);

        return new ExchangeRateDto(
                current.baseCurrency(),
                current.targetCurrency(),
                current.rate(),
                current.fetchedDate(),
                delta,
                lastSeenAt
        );
    }

    /**
     * ✅ TTL 기반 "거의 실시간" 환율
     * - 최근 cacheTtlSeconds 이내에 가져온 값이 있으면 DB에서 사용
     * - 없으면 외부 API 호출 후 저장
     */
    public ExchangeRateDto getLatestRateFresh() {
        log.info("getLatestRateFresh 시작 (ttl={}s)", cacheTtlSeconds);

        LocalDateTime cutoff = LocalDateTime.now().minusSeconds(cacheTtlSeconds);

        return repository
                .findTopByBaseCurrencyAndTargetCurrencyAndFetchedAtAfterOrderByFetchedAtDesc("USD", "KRW", cutoff)
                .map(this::convertToDto)
                .orElseGet(this::fetchAndSaveNow);
    }

    // ====== fetch + save ======

    private ExchangeRateDto fetchAndSaveNow() {
        // 수출입은행 API는 searchdate(yyyyMMdd)라서 "오늘" 데이터만 조회 가능
        LocalDate today = LocalDate.now();
        log.info("💱 외부 API에서 환율 조회 시도: {}", today);

        List<ExchangeResponseDto> response = fetchRateFromApi(today);

        // 오늘자 데이터가 없으면 전날 fallback
        LocalDate usedDate = today;
        if (response == null || response.isEmpty()) {
            log.warn("❗ 오늘({}) 환율 데이터 없음, 전날로 재시도", today);
            LocalDate yesterday = today.minusDays(1);
            response = fetchRateFromApi(yesterday);

            if (response == null || response.isEmpty()) {
                throw new RuntimeException("오늘 및 전날 환율 데이터 없음");
            }
            usedDate = yesterday;
        }

        ExchangeResponseDto usd = response.stream()
                .filter(dto -> "USD".equalsIgnoreCase(dto.getCurrencyUnit()))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("USD 환율 없음"));

        double rate = Double.parseDouble(usd.getDealBasR().replace(",", ""));

        ExchangeRate entity = ExchangeRate.builder()
                .baseCurrency("USD")
                .targetCurrency("KRW")
                .rate(rate)
                .fetchedDate(usedDate)               // API 기준 날짜
                .fetchedAt(LocalDateTime.now())      // ✅ 실시간 느낌을 위한 저장 시각
                .createdAt(LocalDateTime.now())
                .build();

        repository.save(entity);
        return convertToDto(entity);
    }

    private List<ExchangeResponseDto> fetchRateFromApi(LocalDate date) {
        URI uri = UriComponentsBuilder
                .fromHttpUrl("https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON")
                .queryParam("authkey", serviceKey)
                .queryParam("searchdate", date.format(DateTimeFormatter.ofPattern("yyyyMMdd")))
                .queryParam("data", "AP01")
                .build(true)
                .toUri();

        log.info("📡 환율 API 호출 URI: {}", uri);

        try {
            return webClient.get()
                    .uri(uri)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<List<ExchangeResponseDto>>() {})
                    .block();
        } catch (Exception e) {
            log.error("API 호출 실패: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    private ExchangeRateDto convertToDto(ExchangeRate e) {
        return new ExchangeRateDto(
                e.getBaseCurrency(),
                e.getTargetCurrency(),
                e.getRate(),
                e.getFetchedDate().toString(),
                null,
                null
        );
    }
}
