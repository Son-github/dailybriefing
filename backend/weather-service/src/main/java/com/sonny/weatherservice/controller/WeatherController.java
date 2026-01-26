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
    @Operation(summary = "지역별 날씨 요약", description = "region(SEOUL/BUSAN/...)에 해당하는 날씨 요약을 반환합니다.")
    public Map<String, String> getWeatherSummary(
            @RequestParam(defaultValue = "SEOUL") String region
    ) {
        return weatherService.getCurrentWeatherSummary(region);
    }
}
