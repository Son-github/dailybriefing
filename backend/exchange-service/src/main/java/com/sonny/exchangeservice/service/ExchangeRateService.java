package com.sonny.exchangeservice.service;

import com.sonny.exchangeservice.domain.ExchangeRate;
import com.sonny.exchangeservice.dto.ExchangeRateDto;
import com.sonny.exchangeservice.repository.ExchangeRateRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.Map;

@Service
public class ExchangeRateService {

    private static final String API_URL_TEMPLATE = "https://open.er-api.com/v6/latest/";
    private final RestTemplate restTemplate = new RestTemplate();
    private final ExchangeRateRepository repository;

    public ExchangeRateService(ExchangeRateRepository repository) {
        this.repository = repository;
    }

    public ExchangeRateDto getLatestRate(String base) {
        String url = API_URL_TEMPLATE + base.toUpperCase();
        ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
        Map<String, Object> body = response.getBody();

        Map<String, Double> rates = (Map<String, Double>) body.get("conversion_rates");
        String time = (String) body.get("time_last_update_utc");

        // 저장 예시 (USD → KRW만)
        if (rates.containsKey("KRW")) {
            repository.save(ExchangeRate.builder()
                    .baseCurrency(base.toUpperCase())
                    .targetCurrency("KRW")
                    .rate(rates.get("KRW"))
                    .fetchedAt(LocalDateTime.now())
                    .build());
        }

        return new ExchangeRateDto(base, rates, time);
    }
}
