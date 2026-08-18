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
import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Slf4j
@RequiredArgsConstructor
@Service
public class WeatherService {

    private static final String SEOUL_NX = "60";
    private static final String SEOUL_NY = "127";

    private final WebClient customWebClient;
    private final WeatherFetchLogRepository fetchLogRepository;
    private final ObjectMapper objectMapper;

    @Value("${external.weather.url}")
    private String apiUrl;

    @Value("${external.weather.service-key}")
    private String apiKey;

    @SuppressWarnings("unchecked")
    public Map<String, String> getCurrentWeatherSummary() {
        try {
            String rawResponse = fetchWeatherFromApi();
            Map<String, Object> root = objectMapper.readValue(rawResponse, new TypeReference<>() {});
            Map<String, Object> response = (Map<String, Object>) root.get("response");
            Map<String, Object> body = (Map<String, Object>) response.get("body");
            Map<String, Object> items = (Map<String, Object>) body.get("items");
            List<Map<String, Object>> itemList = (List<Map<String, Object>>) items.get("item");

            String baseDate = String.valueOf(itemList.get(0).get("baseDate"));
            String baseTime = String.valueOf(itemList.get(0).get("baseTime"));
            String temperature = getClosestValue(itemList, "T1H");
            String sky = toSkyText(
                    getClosestValue(itemList, "SKY"),
                    getClosestValue(itemList, "PTY")
            );

            fetchLogRepository.save(WeatherFetchLog.builder()
                    .baseDate(baseDate)
                    .baseTime(baseTime)
                    .nx(SEOUL_NX)
                    .ny(SEOUL_NY)
                    .fetchedAt(LocalDateTime.now())
                    .build());

            return Map.of(
                    "temperature", temperature,
                    "sky", sky,
                    "baseDate", baseDate,
                    "baseTime", baseTime
            );
        } catch (Exception e) {
            log.error("날씨 데이터 처리 실패: {}", e.getMessage());
            throw new RuntimeException("날씨 데이터 처리 실패", e);
        }
    }

    private String fetchWeatherFromApi() {
        ForecastBase forecastBase = getForecastBase(LocalDateTime.now());
        String url = apiUrl
                + "?serviceKey=" + apiKey
                + "&numOfRows=100&pageNo=1"
                + "&base_date=" + forecastBase.date()
                + "&base_time=" + forecastBase.time()
                + "&nx=" + SEOUL_NX
                + "&ny=" + SEOUL_NY
                + "&dataType=JSON";

        return customWebClient.get()
                .uri(URI.create(url))
                .retrieve()
                .bodyToMono(String.class)
                .block();
    }

    private String getClosestValue(List<Map<String, Object>> items, String category) {
        LocalDateTime now = LocalDateTime.now();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyyMMddHHmm");

        return items.stream()
                .filter(item -> category.equals(item.get("category")))
                .min(Comparator.comparing(item -> {
                    LocalDateTime forecastTime = LocalDateTime.parse(
                            String.valueOf(item.get("fcstDate")) + item.get("fcstTime"),
                            formatter
                    );
                    return Math.abs(java.time.Duration.between(now, forecastTime).toMinutes());
                }))
                .map(item -> String.valueOf(item.get("fcstValue")))
                .orElse("-");
    }

    private String toSkyText(String skyCode, String precipitationCode) {
        if (precipitationCode != null && !precipitationCode.equals("-") && !precipitationCode.equals("0")) {
            return switch (precipitationCode) {
                case "1" -> "비";
                case "2" -> "비/눈";
                case "3" -> "눈";
                case "4" -> "소나기";
                default -> "강수";
            };
        }

        return switch (skyCode) {
            case "1" -> "맑음";
            case "3" -> "구름많음";
            case "4" -> "흐림";
            default -> "알 수 없음";
        };
    }

    private ForecastBase getForecastBase(LocalDateTime now) {
        LocalDateTime base = now.getMinute() < 30 ? now.minusHours(1) : now;
        return new ForecastBase(
                base.format(DateTimeFormatter.ofPattern("yyyyMMdd")),
                String.format("%02d30", base.getHour())
        );
    }

    private record ForecastBase(String date, String time) {}
}
