package com.sonny.weatherservice.controller;

import com.sonny.weatherservice.dto.WeatherResponse;
import com.sonny.weatherservice.service.WeatherService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/weather")
@Tag(name = "weather", description = "날씨 데이터 API")
public class WeatherController {

    private final WeatherService weatherService;

    @GetMapping("/fetch")
    @Operation(summary = "날씨 데이터 가져오기 및 저장", description = "공공데이터포털에서 날씨 데이터를 가져와 DB에 저장합니다.")
    public Map<String, Object> fetchAndSaveWeather() {
        return weatherService.getCurrentWeatherAsMap();
    }
}

