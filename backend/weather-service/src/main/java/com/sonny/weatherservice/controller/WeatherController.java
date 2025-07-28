package com.sonny.weatherservice.controller;

import com.sonny.weatherservice.domain.Weather;
import com.sonny.weatherservice.dto.WeatherViewDto;
import com.sonny.weatherservice.service.WeatherService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Weather", description = "서울 초단기예보 조회 & 저장")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/weather")
public class WeatherController {

    private final WeatherService weatherService;

    @Operation(summary = "실시간 서울날씨 보기", description = "API에서 가져온 데이터를 바로 반환(저장 안함)")
    @GetMapping("/seoul/live")
    public List<WeatherViewDto> getSeoulLiveWeather() {
        return weatherService.fetchSeoulWeatherOnly();
    }

    @Operation(summary = "서울날씨 저장", description = "API에서 가져온 데이터를 DB에 저장")
    @PostMapping("/seoul")
    public List<Weather> saveSeoulWeather() {
        return weatherService.fetchAndSaveSeoulWeather();
    }
}
