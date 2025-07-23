package com.sonny.weatherservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sonny.weatherservice.domain.Weather;
import com.sonny.weatherservice.dto.UltraSrtFcstResponse;
import com.sonny.weatherservice.repository.WeatherRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriComponentsBuilder;

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

    // 서울 종로구 고정
    private static final String NX = "60";
    private static final String NY = "127";

    private final WebClient webClient = WebClient.builder()
            .baseUrl("http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0")
            .build();

    // 오늘→없으면 전날 자동 저장
    public List<Weather> fetchAndSaveSeoulWeatherAuto() {
        String today = getToday();
        String baseTime = getLatestBaseTime();

        List<Weather> result = fetchAndSave(today, baseTime);
        if (result.isEmpty()) {
            String yesterday = getYesterday();
            result = fetchAndSave(yesterday, baseTime);
        }
        return result;
    }

    // 오늘→없으면 전날 자동 조회
    public List<Weather> getSeoulWeatherTodayOrYesterday() {
        String today = getToday();
        List<Weather> result = weatherRepository.findByFcstDate(today);
        if (result.isEmpty()) {
            String yesterday = getYesterday();
            result = weatherRepository.findByFcstDate(yesterday);
        }
        return result;
    }

    // 기상청 base_time: 30분 단위, 여기선 "직전 30분 단위"
    private String getLatestBaseTime() {
        LocalDateTime now = LocalDateTime.now();
        int hour = now.getHour();
        int minute = now.getMinute();

        if (minute < 30) {
            hour = hour - 1;
            minute = 30;
        } else {
            minute = 0;
        }
        if (hour < 0) hour = 23;

        return String.format("%02d%02d", hour, minute);
    }

    // 오늘 날짜 yyyyMMdd
    private String getToday() {
        return LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
    }

    // 어제 날짜 yyyyMMdd
    private String getYesterday() {
        return LocalDate.now().minusDays(1).format(DateTimeFormatter.ofPattern("yyyyMMdd"));
    }

    // 실제 API 호출/저장
    private List<Weather> fetchAndSave(String baseDate, String baseTime) {
        String apiUrl = "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst";
        String serviceKey = "wVTEulNe7szg24bFXQR97HNuuhLPsv7cyJrNUna3jrQ89YkWS5cm7%2FJvmv6Hbrq7sIYgIT0edqmbAf%2B8BQummQ%3D%3D";
        String numOfRows = "100";
        String pageNo = "1";
        String nx = "55";
        String ny = "127";

// 문자열 포맷팅으로 직접 조립
        String url = String.format(
                "%s?serviceKey=%s&numOfRows=%s&pageNo=%s&base_date=%s&base_time=%s&nx=%s&ny=%s",
                apiUrl, serviceKey, numOfRows, pageNo, baseDate, baseTime, nx, ny
        );

        log.info("최종 요청 URL: {}" + url); // 또는 log.info("...")

        String json = webClient.get()
                .uri(url)
                .retrieve()
                .bodyToMono(String.class)
                .block();

        try {
            ObjectMapper mapper = new ObjectMapper();
            UltraSrtFcstResponse resp = mapper.readValue(json, UltraSrtFcstResponse.class);
            List<Weather> weathers = resp.getResponse().getBody().getItems().getItem().stream()
                    .map(i -> Weather.builder()
                            .fcstDate(i.getFcstDate())
                            .fcstTime(i.getFcstTime())
                            .category(i.getCategory())
                            .value(i.getFcstValue())
                            .build())
                    .collect(Collectors.toList());
            weatherRepository.saveAll(weathers);
            return weathers;
        } catch (Exception e) {
            return List.of(); // 실패 시 빈 리스트
        }
    }
}

