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

import java.time.LocalDate;
import java.time.LocalDateTime;
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
        log.info("외부 API 호출 시작");
        List<ExchangeResponseDto> response = webClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path(apiUrl)
                        .queryParam("authkey", serviceKey)
                        .queryParam("data", "AP01")
                        .build())
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<List<ExchangeResponseDto>>() {})
                .block();

        log.info("외부 API 결과: {}", response);

        ExchangeResponseDto usd = response.stream()
                .filter(dto -> "USD".equalsIgnoreCase(dto.getCurrencyUnit()))
                .findFirst()
                .orElseThrow(() -> {
                    log.error("usd 환율 데이터 찾을 수 없음");
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

    private ExchangeRateDto convertToDto(ExchangeRate e) {
        return new ExchangeRateDto(e.getBaseCurrency(), e.getTargetCurrency(), e.getRate(), e.getFetchedDate().toString());
    }
}
