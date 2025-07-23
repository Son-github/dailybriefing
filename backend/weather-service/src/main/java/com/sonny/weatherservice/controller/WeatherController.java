package com.sonny.weatherservice.controller;

import com.sonny.weatherservice.domain.Weather;
import com.sonny.weatherservice.service.WeatherService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Weather", description = "서울(종로구) 오늘/전날 날씨 저장·조회 (파라미터 필요 없음)")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/weather")
public class WeatherController {

    private final WeatherService weatherService;

    @Operation(summary = "오늘 서울날씨 저장(없으면 전날)", description = "파라미터 없이 호출하면 됨")
    @PostMapping("/seoul")
    public List<Weather> fetchAndSaveSeoulAuto() {
        return weatherService.fetchAndSaveSeoulWeatherAuto();
    }

    @Operation(summary = "DB에서 오늘(없으면 전날) 서울날씨 조회", description = "파라미터 없이 호출하면 됨")
    @GetMapping("/seoul")
    public List<Weather> getSeoulTodayOrYesterday() {
        return weatherService.getSeoulWeatherTodayOrYesterday();
    }
}
