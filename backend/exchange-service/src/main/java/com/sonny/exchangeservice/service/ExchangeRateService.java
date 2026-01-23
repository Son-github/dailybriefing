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

    // ✅ 신규
    private final ExchangeLastSeenRepository lastSeenRepository;

    @Value("${external.exchange.api-url}")
    private String apiUrl;

    @Value("${external.exchange.service-key}")
    private String serviceKey;

    /**
     * ✅ 유저 기준 "마지막으로 본 환율"까지 포함해서 반환
     * - 호출 시 lastSeen을 현재 값으로 갱신(upsert)
     */
    @Transactional
    public ExchangeRateDto getLatestRateWithLastSeen(String userId) {
        // 1) 기존 로직: 오늘(또는 전날) 캐시된 환율 가져오기
        ExchangeRateDto current = getLatestRate(); // 기존 메서드 재사용

        // 2) lastSeen 조회
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

        // 3) lastSeen을 "현재값"으로 upsert 저장
        ExchangeLastSeen toSave = ExchangeLastSeen.builder()
                .userId(userId)
                .baseCurrency(current.baseCurrency())
                .targetCurrency(current.targetCurrency())
                .lastSeenRate(current.rate())
                .lastSeenAt(LocalDateTime.now())
                .lastFetchedDate(LocalDate.parse(current.fetchedDate()))
                .build();

        lastSeenRepository.save(toSave);

        // 4) 응답: 기존 정보 + lastSeen 정보
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
     * ✅ 기존 로직 유지: 오늘 캐시 없으면 외부 API로 가져와 저장
     */
    public ExchangeRateDto getLatestRate() {
        log.info("getLatestRate 시작");
        LocalDate today = LocalDate.now();

        return repository.findByBaseCurrencyAndTargetCurrencyAndFetchedDate("USD", "KRW", today)
                .map(this::convertToDto)
                .orElseGet(() -> fetchAndSave(today));
    }

    private ExchangeRateDto fetchAndSave(LocalDate date) {
        log.info("💱 외부 API에서 환율 조회 시도: {}", date);

        List<ExchangeResponseDto> response = fetchRateFromApi(date);

        // 🔁 오늘자 데이터가 없으면 전날로 fallback
        if (response == null || response.isEmpty()) {
            log.warn("❗ 오늘({}) 환율 데이터 없음, 전날로 재시도", date);
            LocalDate yesterday = date.minusDays(1);
            response = fetchRateFromApi(yesterday);

            if (response == null || response.isEmpty()) {
                throw new RuntimeException("오늘 및 전날 환율 데이터 없음");
            }

            date = yesterday;
        }

        ExchangeResponseDto usd = response.stream()
                .filter(dto -> "USD".equalsIgnoreCase(dto.getCurrencyUnit()))
                .findFirst()
                .orElseThrow(() -> {
                    log.error("USD 환율 데이터 없음");
                    return new RuntimeException("USD 환율 없음");
                });

        double rate = Double.parseDouble(usd.getDealBasR().replace(",", ""));

        ExchangeRate entity = ExchangeRate.builder()
                .baseCurrency("USD")
                .targetCurrency("KRW")
                .rate(rate)
                .fetchedDate(date)
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
        // ✅ 기존 DTO 형태 유지 + 신규 필드는 null로
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
