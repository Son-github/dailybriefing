package com.sonny.weatherservice.controller;

import com.sonny.weatherservice.service.WeatherService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/weather")
@Tag(name = "weather", description = "날씨 데이터 API")
public class WeatherController {

    private final WeatherService weatherService;

    @GetMapping("/summary")
    @Operation(summary = "서울 날씨 요약")
    public Map<String, String> getWeatherSummary() {
        return weatherService.getCurrentWeatherSummary();
    }
}
