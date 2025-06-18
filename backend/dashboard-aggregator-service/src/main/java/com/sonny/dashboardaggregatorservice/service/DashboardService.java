package com.sonny.dashboardaggregatorservice.service;

import com.sonny.dashboardaggregatorservice.dto.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.ClientResponse;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.List;
import java.util.function.Function;

@Service
public class DashboardService {
    private final WebClient webClient;

    public DashboardService(WebClient webClient) {
        this.webClient = webClient;
    }

    public Mono<DashboardResponse> aggregate() {
        Mono<ExchangeDto> exchange = fetch("http://localhost:8081/api/exchange/USD", ExchangeDto.class);
        Mono<StockDto> stock = fetch("http://localhost:8082/api/stock/KOSPI", StockDto.class);
        Mono<WeatherDto> weather = fetch("http://localhost:8083/api/weather/seoul", WeatherDto.class);
        Mono<AirQualityDto> air = fetch("http://localhost:8084/api/airquality/seoul", AirQualityDto.class);
        Mono<List<NewsDto>> news = fetchFlux("http://localhost:8085/api/news", NewsDto.class);

        return Mono.zip(exchange, stock, weather, air, news)
                .map(tuple -> new DashboardResponse(
                        "success",
                        tuple.getT1(), tuple.getT2(), tuple.getT3(), tuple.getT4(), tuple.getT5(),
                        LocalDateTime.now().toString()
                ));
    }

    private <T> Mono<T> fetch(String uri, Class<T> clazz) {
        return webClient.get().uri(uri)
                .retrieve()
                .onStatus(HttpStatus::isError, this::handleHttpError)
                .bodyToMono(clazz);
    }

    private <T> Mono<List<T>> fetchFlux(String uri, Class<T> clazz) {
        return webClient.get().uri(uri)
                .retrieve()
                .onStatus(HttpStatus::isError, handleHttpError())
                .bodyToFlux(clazz).collectList();
    }

    private Function<ClientResponse, Mono<? extends Throwable>> handleHttpError() {
        return response -> response.createException().flatMap(Mono::error);
    }
}
