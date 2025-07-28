package com.sonny.weatherservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sonny.weatherservice.domain.Weather;
import com.sonny.weatherservice.dto.UltraSrtFcstResponse;
import com.sonny.weatherservice.dto.WeatherViewDto;
import com.sonny.weatherservice.repository.WeatherRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class WeatherService {

    private final WeatherRepository weatherRepository;

    @Value("${external.weather.service-key}")
    private String apiKey;

    private static final String NX = "60";
    private static final String NY = "127";
    private final WebClient webClient = WebClient.create();

    /** 1. 실시간 조회만 (저장 X) */
    public List<WeatherViewDto> fetchSeoulWeatherOnly() {
        String today = getToday();
        String baseTime = getLatestBaseTime();
        return fetchWeatherFromApi(today, baseTime).stream()
                .map(i -> WeatherViewDto.builder()
                        .fcstDate(i.getFcstDate())
                        .fcstTime(i.getFcstTime())
                        .category(i.getCategory())
                        .value(i.getFcstValue())
                        .build())
                .collect(Collectors.toList());
    }

    /** 2. 조회 후 DB저장 */
    public List<Weather> fetchAndSaveSeoulWeather() {
        String today = getToday();
        String baseTime = getLatestBaseTime();
        List<UltraSrtFcstResponse.Item> items = fetchWeatherFromApi(today, baseTime);
        List<Weather> weathers = items.stream()
                .map(i -> Weather.builder()
                        .fcstDate(i.getFcstDate())
                        .fcstTime(i.getFcstTime())
                        .category(i.getCategory())
                        .value(i.getFcstValue())
                        .build())
                .collect(Collectors.toList());
        weatherRepository.saveAll(weathers);
        return weathers;
    }

    private List<UltraSrtFcstResponse.Item> fetchWeatherFromApi(String baseDate, String baseTime) {
        String url = "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst"
                + "?serviceKey=" + apiKey
                + "&numOfRows=60&pageNo=1&dataType=JSON"
                + "&base_date=" + baseDate
                + "&base_time=" + baseTime
                + "&nx=" + NX
                + "&ny=" + NY;

        log.info("요청 URL: {}", url);

        // 1. API 호출 + 상태코드 검사
        String response;
        int statusCode;
        try {
            var clientResponse = webClient.get()
                    .uri(url)
                    .exchangeToMono(res -> res.bodyToMono(String.class)
                            .map(body -> new java.util.AbstractMap.SimpleEntry<>(res.statusCode().value(), body)))
                    .block();

            statusCode = clientResponse.getKey();
            response = clientResponse.getValue();
        } catch (Exception e) {
            throw new RuntimeException("기상청 API 호출 중 네트워크 오류: " + e.getMessage(), e);
        }

        // 2. HTTP 상태 코드 확인
        if (statusCode != 200) {
            throw new RuntimeException("기상청 API 호출 실패: HTTP 상태 " + statusCode + "\n응답: " + response);
        }

        // 3. 응답이 JSON이 아닐 경우 방어 (HTML/XML)
        if (response == null || response.isEmpty() || response.trim().startsWith("<")) {
            throw new RuntimeException("기상청 API 호출 실패: JSON 응답 아님 (아마 파라미터 오류/인증 문제)\n응답: " + response);
        }

        // 4. JSON 파싱
        try {
            ObjectMapper mapper = new ObjectMapper();
            UltraSrtFcstResponse parsed = mapper.readValue(response, UltraSrtFcstResponse.class);

            // 5. 응답 구조 검증
            if (parsed.getResponse() == null ||
                    parsed.getResponse().getBody() == null ||
                    parsed.getResponse().getBody().getItems() == null ||
                    parsed.getResponse().getBody().getItems().getItem() == null) {
                throw new RuntimeException("기상청 API 응답 구조가 올바르지 않음\n응답: " + response);
            }

            return parsed.getResponse().getBody().getItems().getItem();

        } catch (Exception e) {
            throw new RuntimeException("기상청 API 파싱 실패\n응답: " + response, e);
        }
    }

    /** 날짜 & 시간 유틸 */
    private String getToday() {
        return LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
    }
    private String getLatestBaseTime() {
        LocalDateTime now = LocalDateTime.now();
        int hour = now.getHour();
        int minute = now.getMinute();
        if (minute < 30) { hour = hour - 1; minute = 30; } else { minute = 0; }
        if (hour < 0) hour = 23;
        return String.format("%02d%02d", hour, minute);
    }
}
