package com.sonny.weatherservice.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sonny.weatherservice.domain.WeatherFetchLog;
import com.sonny.weatherservice.repository.WeatherFetchLogRepository;
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

    private final WebClient customWebClient;
    private final WeatherFetchLogRepository fetchLogRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${external.weather.url}")
    private String apiUrl;

    @Value("${external.weather.service-key}")
    private String apiKey;

    private static final String NX = "60";
    private static final String NY = "127";

    /**
     * 최신 발표 기준 + 현재 시각과 가장 가까운 기온/하늘상태만 리턴
     */
    public Map<String, String> getCurrentWeatherSummary() {
        try {
            // 1) API 호출
            String rawResponse = fetchWeatherFromApi();
            Map<String, Object> map = objectMapper.readValue(rawResponse, new TypeReference<>() {});
            Map<String, Object> response = (Map<String, Object>) map.get("response");
            Map<String, Object> body = (Map<String, Object>) response.get("body");
            Map<String, Object> items = (Map<String, Object>) body.get("items");
            List<Map<String, Object>> itemList = (List<Map<String, Object>>) items.get("item");

            // 2) 발표 기준 (baseDate, baseTime) 추출
            String baseDate = String.valueOf(((Map<String, Object>) itemList.get(0)).get("baseDate"));
            String baseTime = String.valueOf(((Map<String, Object>) itemList.get(0)).get("baseTime"));

            // 3) 온도와 하늘 상태 중 현재 시각과 가장 가까운 값 추출
            String temperature = getClosestValue(itemList, "T1H");
            String skyCode = getClosestValue(itemList, "SKY");
            String skyText = switch (skyCode) {
                case "1" -> "맑음";
                case "3" -> "구름많음";
                case "4" -> "흐림";
                default -> "알 수 없음";
            };

            // 4) 호출 기록 저장
            fetchLogRepository.save(
                    WeatherFetchLog.builder()
                            .baseDate(baseDate)
                            .baseTime(baseTime)
                            .nx(NX)
                            .ny(NY)
                            .fetchedAt(LocalDateTime.now())
                            .build()
            );

            // 5) 프론트로 간단 요약 리턴
            return Map.of(
                    "temperature", temperature,
                    "sky", skyText,
                    "baseDate", baseDate,
                    "baseTime", baseTime
            );

        } catch (Exception e) {
            log.error("날씨 데이터 처리 실패: {}", e.getMessage(), e);
            throw new RuntimeException("날씨 데이터 처리 실패", e);
        }
    }

    /**
     * 공공데이터포털 API 호출
     */
    private String fetchWeatherFromApi() {
        LocalDateTime now = LocalDateTime.now();
        String baseDate = now.format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String baseTime = getBaseTime(now);

        String url = apiUrl +
                "?serviceKey=" + apiKey +
                "&numOfRows=100" +
                "&pageNo=1" +
                "&base_date=" + baseDate +
                "&base_time=" + baseTime +
                "&nx=" + NX +
                "&ny=" + NY +
                "&dataType=JSON";

        log.info("요청 URL: {}", url);

        return customWebClient.get()
                .uri(URI.create(url))
                .retrieve()
                .bodyToMono(String.class)
                .block();
    }

    /**
     * 현재 시각과 가장 가까운 예보값 선택
     */
    private String getClosestValue(List<Map<String, Object>> items, String category) {
        LocalDateTime now = LocalDateTime.now();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyyMMddHHmm");

        return items.stream()
                .filter(i -> category.equals(i.get("category")))
                .min(Comparator.comparing(i -> {
                    String fcstDate = String.valueOf(i.get("fcstDate"));
                    String fcstTime = String.valueOf(i.get("fcstTime"));
                    LocalDateTime forecastTime = LocalDateTime.parse(fcstDate + fcstTime, formatter);
                    return Math.abs(java.time.Duration.between(now, forecastTime).toMinutes());
                }))
                .map(i -> String.valueOf(i.get("fcstValue")))
                .orElse("-");
    }

    /**
     * 기상청 API base_time 계산
     */
    private String getBaseTime(LocalDateTime now) {
        int minute = now.getMinute();
        int hour = now.getHour();
        if (minute < 30) hour -= 1;
        if (hour < 0) hour = 23;
        return String.format("%02d30", hour);
    }
}
