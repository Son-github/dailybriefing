package com.sonny.weatherservice.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sonny.weatherservice.domain.WeatherFetchLog;
import com.sonny.weatherservice.repository.WeatherFetchLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.net.URI;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Slf4j
@RequiredArgsConstructor
@Service
public class WeatherService {

    private static final String CACHE_KEY_PREFIX = "dailybriefing:weather:summary:";
    private static final String LOCK_KEY_PREFIX = "dailybriefing:lock:weather:summary:";
    private static final Duration LOCK_TTL = Duration.ofSeconds(30);
    private static final TypeReference<Map<String, String>> WEATHER_CACHE_TYPE = new TypeReference<>() {};

    private final WebClient customWebClient;
    private final WeatherFetchLogRepository fetchLogRepository;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    @Value("${external.weather.url}")
    private String apiUrl;

    @Value("${external.weather.service-key}")
    private String apiKey;

    @Value("${app.data-refresh-ms:600000}")
    private long refreshMs;

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
        Map<String, String> cached = readCached(region);
        if (cached != null) return cached;

        String lockToken = acquireLock(region);
        if (lockToken == null) {
            Map<String, String> waited = waitForCached(region);
            if (waited != null) return waited;
        }

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
            Map<String, String> result = Map.of(
                    "region", region,
                    "temperature", temperature,
                    "sky", skyText,
                    "baseDate", baseDate,
                    "baseTime", baseTime
            );
            writeCached(region, result);
            return result;

        } catch (Exception e) {
            log.error("날씨 데이터 처리 실패: {}", e.getMessage(), e);
            cached = readCached(region);
            if (cached != null) return cached;
            throw new RuntimeException("날씨 데이터 처리 실패", e);
        } finally {
            releaseLock(region, lockToken);
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
        ForecastBase forecastBase = getForecastBase(now);

        String url = apiUrl +
                "?serviceKey=" + apiKey +
                "&numOfRows=100" +
                "&pageNo=1" +
                "&base_date=" + forecastBase.date() +
                "&base_time=" + forecastBase.time() +
                "&nx=" + nx +
                "&ny=" + ny +
                "&dataType=JSON";

        // 이전에는 serviceKey가 포함된 전체 URL을 로그로 남겼다. 키 노출 방지를 위해 격자만 기록한다.
        log.info("Weather request grid: nx={}, ny={}", nx, ny);

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

    private ForecastBase getForecastBase(LocalDateTime now) {
        LocalDateTime base = now.getMinute() < 30 ? now.minusHours(1) : now;
        return new ForecastBase(
                base.format(DateTimeFormatter.ofPattern("yyyyMMdd")),
                String.format("%02d30", base.getHour())
        );
    }

    private record ForecastBase(String date, String time) {}

    private Map<String, String> readCached(String region) {
        try {
            String value = redisTemplate.opsForValue().get(cacheKey(region));
            if (value == null || value.isBlank()) return null;
            return objectMapper.readValue(value, WEATHER_CACHE_TYPE);
        } catch (DataAccessException | JsonProcessingException e) {
            log.warn("Weather Redis cache read failed: {}", e.getMessage());
            return null;
        }
    }

    private void writeCached(String region, Map<String, String> response) {
        try {
            redisTemplate.opsForValue().set(cacheKey(region), objectMapper.writeValueAsString(response), Duration.ofMillis(refreshMs));
        } catch (DataAccessException | JsonProcessingException e) {
            log.warn("Weather Redis cache write failed: {}", e.getMessage());
        }
    }

    private String acquireLock(String region) {
        try {
            String token = UUID.randomUUID().toString();
            Boolean locked = redisTemplate.opsForValue().setIfAbsent(lockKey(region), token, LOCK_TTL);
            return Boolean.TRUE.equals(locked) ? token : null;
        } catch (DataAccessException e) {
            log.warn("Weather Redis lock failed: {}", e.getMessage());
            return UUID.randomUUID().toString();
        }
    }

    private void releaseLock(String region, String lockToken) {
        if (lockToken == null) return;
        try {
            if (lockToken.equals(redisTemplate.opsForValue().get(lockKey(region)))) {
                redisTemplate.delete(lockKey(region));
            }
        } catch (DataAccessException e) {
            log.warn("Weather Redis lock release failed: {}", e.getMessage());
        }
    }

    private Map<String, String> waitForCached(String region) {
        for (int i = 0; i < 5; i++) {
            try {
                Thread.sleep(200);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return null;
            }

            Map<String, String> cached = readCached(region);
            if (cached != null) return cached;
        }
        return null;
    }

    private String cacheKey(String region) {
        return CACHE_KEY_PREFIX + region;
    }

    private String lockKey(String region) {
        return LOCK_KEY_PREFIX + region;
    }
}
