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

    // ✅ region -> nx, ny (대표 격자)
    // 필요하면 구/군 단위로 더 쪼갤 수 있음
    private static final Map<String, Grid> REGION_GRID = Map.of(
            "SEOUL",   new Grid("60", "127"),
            "BUSAN",   new Grid("98", "76"),
            "INCHEON", new Grid("55", "124"),
            "DAEGU",   new Grid("89", "90"),
            "DAEJEON", new Grid("67", "100"),
            "GWANGJU", new Grid("58", "74"),
            "JEJU",    new Grid("52", "38")
    );

    private record Grid(String nx, String ny) {}

    private String normalizeRegion(String raw) {
        if (raw == null || raw.isBlank()) return "SEOUL";
        String v = raw.trim().toUpperCase();
        return REGION_GRID.containsKey(v) ? v : "SEOUL";
    }

    /**
     * ✅ 지역별 요약
     * - region: SEOUL/BUSAN/...
     */
    public Map<String, String> getCurrentWeatherSummary(String regionRaw) {
        String region = normalizeRegion(regionRaw);
        Grid grid = REGION_GRID.get(region);

        try {
            // 1) API 호출
            String rawResponse = fetchWeatherFromApi(grid.nx(), grid.ny());
            Map<String, Object> map = objectMapper.readValue(rawResponse, new TypeReference<>() {});
            Map<String, Object> response = (Map<String, Object>) map.get("response");
            Map<String, Object> body = (Map<String, Object>) response.get("body");
            Map<String, Object> items = (Map<String, Object>) body.get("items");
            List<Map<String, Object>> itemList = (List<Map<String, Object>>) items.get("item");

            // 2) 발표 기준 (baseDate, baseTime) 추출
            String baseDate = String.valueOf(((Map<String, Object>) itemList.get(0)).get("baseDate"));
            String baseTime = String.valueOf(((Map<String, Object>) itemList.get(0)).get("baseTime"));

            // 3) 현재와 가장 가까운 값들
            String temperature = getClosestValue(itemList, "T1H");
            String skyCode = getClosestValue(itemList, "SKY");
            String ptyCode = getClosestValue(itemList, "PTY"); // ✅ 강수형태(비/눈/소나기)도 같이
            String skyText = toSkyText(skyCode, ptyCode);

            // 4) 호출 기록 저장 (지역 nx/ny로 저장)
            fetchLogRepository.save(
                    WeatherFetchLog.builder()
                            .baseDate(baseDate)
                            .baseTime(baseTime)
                            .nx(grid.nx())
                            .ny(grid.ny())
                            .fetchedAt(LocalDateTime.now())
                            .build()
            );

            // 5) 프론트로 간단 요약 리턴 (+region 포함)
            return Map.of(
                    "region", region,
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

    private String toSkyText(String skyCode, String ptyCode) {
        // ✅ PTY가 0이 아니면 SKY보다 PTY 우선(실무 UX 정석)
        // PTY: 0 없음, 1 비, 2 비/눈, 3 눈, 4 소나기
        if (ptyCode != null && !ptyCode.equals("-") && !ptyCode.equals("0")) {
            return switch (ptyCode) {
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

    /**
     * ✅ 공공데이터포털 API 호출 (nx/ny를 파라미터로)
     */
    private String fetchWeatherFromApi(String nx, String ny) {
        LocalDateTime now = LocalDateTime.now();
        String baseDate = now.format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String baseTime = getBaseTime(now);

        String url = apiUrl +
                "?serviceKey=" + apiKey +
                "&numOfRows=100" +
                "&pageNo=1" +
                "&base_date=" + baseDate +
                "&base_time=" + baseTime +
                "&nx=" + nx +
                "&ny=" + ny +
                "&dataType=JSON";

        log.info("요청 URL(region grid): nx={}, ny={}, url={}", nx, ny, url);

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

    private String getBaseTime(LocalDateTime now) {
        int minute = now.getMinute();
        int hour = now.getHour();
        if (minute < 30) hour -= 1;
        if (hour < 0) hour = 23;
        return String.format("%02d30", hour);
    }
}
