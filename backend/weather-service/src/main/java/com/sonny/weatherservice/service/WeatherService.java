package com.sonny.weatherservice.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sonny.weatherservice.config.WeatherConfig;
import com.sonny.weatherservice.domain.Weather;
import com.sonny.weatherservice.dto.WeatherResponseDto;
import com.sonny.weatherservice.repository.WeatherRepository;
import lombok.RequiredArgsConstructor;
import lombok.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class WeatherService {

    private final WeatherConfig weatherConfig;
    private final WeatherRepository weatherRepository;
    private final WebClient webClient = WebClient.builder()
            .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
            .build();

    public WeatherResponseDto fetchAndSaveSeoulWeather() {
        String baseDate = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String baseTime = getClosestTime();
        int nx = 60, ny = 127;

        String url = UriComponentsBuilder.fromHttpUrl(weatherConfig.getApiUrl())
                .queryParam("serviceKey", weatherConfig.getServiceKey())
                .queryParam("numOfRows", 100)
                .queryParam("pageNo", 1)
                .queryParam("dataType", "JSON")
                .queryParam("base_date", baseDate)
                .queryParam("base_time", baseTime)
                .queryParam("nx", nx)
                .queryParam("ny", ny)
                .build(false) // 이중 인코딩 방지
                .toUriString();

        String response = webClient.get()
                .uri(url)
                .accept(MediaType.APPLICATION_JSON)
                .retrieve()
                .bodyToMono(String.class)
                .doOnNext(res -> System.out.println("🧾 API 응답 본문:\n" + res))
                .block();

        ObjectMapper mapper = new ObjectMapper();
        Map<String, Object> map;
        try {
            map = mapper.readValue(response, Map.class);
        } catch (Exception e) {
            throw new RuntimeException("JSON 파싱 실패", e);
        }

        Map<String, String> parsed = parseResponse(map);

        Weather weather = Weather.builder()
                .location("서울")
                .temperature(Double.parseDouble(parsed.getOrDefault("T1H", "0")))
                .sky(skyCodeToText(parsed.getOrDefault("SKY", "1")))
                .humidity(Integer.parseInt(parsed.getOrDefault("REH", "0")))
                .updateAt(toBaseDateTime(baseDate, baseTime))
                .build();

        weatherRepository.save(weather);

        return WeatherResponseDto.builder()
                .location(weather.getLocation())
                .temperature(weather.getTemperature())
                .sky(weather.getSky())
                .humidity(weather.getHumidity())
                .updateAt(weather.getUpdateAt())
                .build();
    }

    private Map<String, String> parseResponse(Map<String, Object> response) {
        Map<String, String> result = new HashMap<>();
        try {
            Map<String, Object> resMap = (Map<String, Object>) response.get("response");
            Map<String, Object> bodyMap = (Map<String, Object>) resMap.get("body");
            Map<String, Object> itemsMap = (Map<String, Object>) bodyMap.get("items");
            List<Map<String, Object>> items = (List<Map<String, Object>>) itemsMap.get("item");

            for (Map<String, Object> item : items) {
                String category = (String) item.get("category");
                String value = String.valueOf(item.get("fcstValue"));
                result.put(category, value);
            }
        } catch (Exception e) {
            throw new RuntimeException("기상청 응답 파싱 실패", e);
        }
        return result;
    }

    private String skyCodeToText(String code) {
        return switch (code) {
            case "1" -> "맑음";
            case "3" -> "구름많음";
            case "4" -> "흐림";
            default -> "정보없음";
        };
    }

    private String getClosestTime() {
        int[] baseHours = {2, 5, 8, 11, 14, 17, 20, 23};
        int now = LocalTime.now().getHour();
        int closest = Arrays.stream(baseHours)
                .filter(h -> h <= now)
                .max()
                .orElse(23);
        return String.format("%02d00", closest);
    }

    private LocalDateTime toBaseDateTime(String date, String time) {
        return LocalDateTime.parse(date + time, DateTimeFormatter.ofPattern("yyyyMMddHHmm"));
    }
}

