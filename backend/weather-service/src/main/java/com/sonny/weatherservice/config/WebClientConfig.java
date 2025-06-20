package com.sonny.weatherservice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {
    @Bean
    public WebClient WebClient() {
        return WebClient.builder().baseUrl("https://api.openweathermap.org").build();
    }
}
