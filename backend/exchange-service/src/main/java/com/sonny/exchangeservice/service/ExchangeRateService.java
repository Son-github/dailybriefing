package com.sonny.exchangeservice.service;

import com.sonny.exchangeservice.domain.ExchangeRate;
import com.sonny.exchangeservice.dto.ExchangeRateDto;
import com.sonny.exchangeservice.dto.ExchangeResponseDto;
import com.sonny.exchangeservice.repository.ExchangeRateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
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

    @Value("${external.exchange.api-url}")
    private String apiUrl;

    @Value("${external.exchange.service-key}")
    private String serviceKey;

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
            return Collections.emptyList(); // 또는 null
        }
    }

    private ExchangeRateDto convertToDto(ExchangeRate e) {
        return new ExchangeRateDto(e.getBaseCurrency(), e.getTargetCurrency(), e.getRate(), e.getFetchedDate().toString());
    }
}
