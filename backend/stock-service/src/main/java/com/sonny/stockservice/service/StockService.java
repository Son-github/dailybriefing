package com.sonny.stockservice.service;

import com.sonny.stockservice.domain.Stock;
import com.sonny.stockservice.dto.ExternalStockResponse;
import com.sonny.stockservice.dto.StockDto;
import com.sonny.stockservice.repository.StockRepository;
import lombok.RequiredArgsConstructor;
import lombok.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class StockService {

    private final WebClient webClient;
    private final StockRepository repository;

    @Value("${stock.api.url}")
    private String apiUrl;

    @Value("${stock.api.key}")
    private String apiKey;

    public StockDto getIndexData(String type) {
        String symbol = getSymbolByType(type);
        String fullUrl = apiUrl + "?symbol=" + symbol + "&apikey=" + apiKey;

        ExternalStockResponse response = webClient.get()
                .uri(fullUrl)
                .retrieve()
                .bodyToMono(ExternalStockResponse.class)
                .block();

        LocalDateTime now = LocalDateTime.now();

        Stock saved = repository.save(Stock.builder()
                .indexName(type)
                .symbol(symbol)
                .price(response.getPrice())
                .changeAmount(response.getChange())
                .changeRate(response.getChangePercent())
                .timestamp(now)
                .build());

        return new StockDto(
                saved.getIndexName(),
                saved.getPrice(),
                saved.getChangeRate(),
                saved.getTimestamp().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
        );
    }

    private String getSymbolByType(String type) {
        return switch (type.toUpperCase()) {
            case "KOSPI" -> "KS11";
            case "NASDAQ" -> "IXIC";
            default -> throw new IllegalArgumentException("지원하지 않는 지수 타입입니다: " + type);
        };
    }
}
