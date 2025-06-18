package com.sonny.dashboardaggregatorservice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.ExchangeFilterFunction;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@Configuration
public class WebClientConfig {

    @Bean
    public WebClient webClient(WebClient.Builder builder) {
        return builder
                .baseUrl("http://localhost")
                .defaultHeader("Accept", "application/json")
                .filter(logRequest()) // 요청 로그 출력
                .build();
    }

    private ExchangeFilterFunction logRequest() {
        return ExchangeFilterFunction.ofRequestProcessor(clientRequest -> {
            System.out.printf("➡️  [%s] %s%n", clientRequest.method(), clientRequest.url());
            return Mono.just(clientRequest);
        });
    }
}
