package com.sonny.exchangeservice.service;

import com.sonny.exchangeservice.domain.ExchangeRate;
import com.sonny.exchangeservice.dto.ExchangeRateDto;
import com.sonny.exchangeservice.repository.ExchangeRateRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ExchangeRateService {

    private static final String API_URL_TEMPLATE = "https://open.er-api.com/v6/latest/";
    private final RestTemplate restTemplate = new RestTemplate();
    private final ExchangeRateRepository repository;

    public ExchangeRateService(ExchangeRateRepository repository) {
        this.repository = repository;
    }

    public ExchangeRateDto getLatestRate(String base) {
        try {
            String url = API_URL_TEMPLATE + base.toUpperCase();
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            Map<String, Object> body = response.getBody();

            Map<String, Object> rawRates = (Map<String, Object>) body.get("conversion_rates");
            Map<String, Double> rates = rawRates.entrySet().stream()
                    .filter(e -> e.getValue() instanceof Number)
                    .collect(Collectors.toMap(
                            Map.Entry::getKey,
                            e -> ((Number) e.getValue()).doubleValue()
                    ));

            String time = (String) body.get("time_last_update_utc");

            if (rates.containsKey("KRW")) {
                repository.save(ExchangeRate.builder()
                        .baseCurrency(base.toUpperCase())
                        .targetCurrency("KRW")
                        .rate(rates.get("KRW"))
                        .fetchedAt(LocalDateTime.now())
                        .build());
            }

            return new ExchangeRateDto(base, rates, time);

        } catch (HttpClientErrorException e) {
            throw new RuntimeException("외부 환율 API 요청 실패: " + e.getStatusCode());
        } catch (Exception e) {
            throw new RuntimeException("환율 데이터 처리 중 오류 발생: " + e.getMessage());
        }
    }
}
