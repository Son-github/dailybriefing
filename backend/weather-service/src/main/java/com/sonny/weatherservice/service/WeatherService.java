package com.sonny.weatherservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sonny.weatherservice.dto.WeatherResponse;
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
        return rawResponse;
    }

    private String getBaseTime(LocalDateTime now) {
        int minute = now.getMinute();
        int hour = now.getHour();
        if (minute < 30) hour -= 1;
        if (hour < 0) hour = 23;
        return String.format("%02d30", hour);
    }
}
