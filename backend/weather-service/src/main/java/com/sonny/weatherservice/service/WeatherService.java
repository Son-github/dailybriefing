package com.sonny.weatherservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sonny.weatherservice.domain.Weather;
import com.sonny.weatherservice.dto.WeatherResponse;
import com.sonny.weatherservice.repository.WeatherRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.net.URI;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Slf4j
@RequiredArgsConstructor
@Service
public class WeatherService {

    private final WebClient customWebClient; // Bean 주입
    private final WeatherRepository weatherRepository; // Repsitory
    private final ObjectMapper objectMapper = new ObjectMapper(); // JSON 파싱

    @Value("${external.weather.url}")
    private String apiUrl;

    @Value("${external.weather.service-key}")
    private String apiKey;

    private static final String NX = "60";
    private static final String NY = "127";

    public String getCurrentWeather() {
        LocalDateTime now = LocalDateTime.now();
        String baseDate = now.format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String baseTime = getBaseTime(now);

        String url = apiUrl +
                "?serviceKey=" + apiKey +
                "&numOfRows=10" +
                "&pageNo=1" +
                "&base_date=" + baseDate +
                "&base_time=" + baseTime +
                "&nx=" + NX +
                "&ny=" + NY +
                "&dataType=JSON";

        log.info("요청 URL: {}", url);

        // **URI.create(url) 사용 → 인코딩 방지**
        String rawResponse = customWebClient.get()
                .uri(URI.create(url))
                .retrieve()
                .bodyToMono(String.class)
                .block();

        log.info("응답: {}", rawResponse);

        // JSON -> Map 변환
        // JSON → Map 변환
        try {
            Map<String, Object> map = objectMapper.readValue(rawResponse, Map.class);
            Map<String, Object> response = (Map<String, Object>) map.get("response");
            Map<String, Object> body = (Map<String, Object>) response.get("body");
            Map<String, Object> items = (Map<String, Object>) body.get("items");
            List<Map<String, Object>> itemList = (List<Map<String, Object>>) items.get("item");

            // DB 저장
            for (Map<String, Object> item : itemList) {
                Weather weather = Weather.builder()
                        .baseDate((String) item.get("baseDate"))
                        .baseTime((String) item.get("baseTime"))
                        .category((String) item.get("category"))
                        .fcstDate((String) item.get("fcstDate"))
                        .fcstTime((String) item.get("fcstTime"))
                        .fcstValue(String.valueOf(item.get("fcstValue")))
                        .nx(String.valueOf(item.get("nx")))
                        .ny(String.valueOf(item.get("ny")))
                        .build();

                weatherRepository.save(weather);
            }

        } catch (Exception e) {
            log.error("JSON 파싱 또는 DB 저장 오류: {}", e.getMessage(), e);
            throw new RuntimeException("날씨 데이터 처리 실패", e);
        }

        return rawResponse;  // 원문도 그대로 반환
    }

    private String getBaseTime(LocalDateTime now) {
        int minute = now.getMinute();
        int hour = now.getHour();
        if (minute < 30) hour -= 1;
        if (hour < 0) hour = 23;
        return String.format("%02d30", hour);
    }
}
