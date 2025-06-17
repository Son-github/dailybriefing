package com.sonny.weatherservice.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sonny.weatherservice.domain.Weather;
import com.sonny.weatherservice.dto.WeatherResponseDto;
import com.sonny.weatherservice.repository.WeatherRepository;
import lombok.RequiredArgsConstructor;
import lombok.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class WeatherService {

    private final WebClient webClient;
    private final WeatherRepository weatherRepository;
    private final ObjectMapper objectMapper =  new ObjectMapper();

    @Value("${weather.api.url}")
    private String apiUrl;

    @Value("${weather.api.key}")
    private String apiKey;

    public WeatherResponseDto getCurrentWeather(String city) {
        String response = webClient.get()
                .uri(uriBuilder -> uriBuilder.path(apiUrl)
                        .queryParam("q", city)
                        .queryParam("appid", apiKey)
                        .queryParam("units", "metric")
                        .build())
                .retrieve()
                .bodyToMono(String.class)
                .block();

        try {
            JsonNode root = objectMapper.readTree(response);
            String weather = root.get("weather").get(0).get("main").asText();
            double temp = root.get("main").get("temp").asDouble();

            Weather weatherEntity = Weather.builder()
                    .city(city)
                    .description(weather)
                    .temperature(temp)
                    .fetchedAt(LocalDateTime.now())
                    .build();
            weatherRepository.save(weatherEntity);

            return WeatherResponseDto.builder()
                    .city(city)
                    .weather(weather)
                    .temperature(temp)
                    .build();
        } catch (Exception e) {
            throw new RuntimeException("날씨 데이터를 처리하는 중 오류 발생", e);
        }
    }
}
