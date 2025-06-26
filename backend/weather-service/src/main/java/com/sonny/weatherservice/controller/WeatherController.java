package com.sonny.weatherservice.controller;

import com.sonny.weatherservice.dto.WeatherResponseDto;
import com.sonny.weatherservice.service.WeatherService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/weather")
@Tag(name = "Weather API", description = "날씨 가져오는 API")
@RequiredArgsConstructor
public class WeatherController {

    private final WeatherService weatherService;

    @Operation(summary = "서울 날씨 조회 및 저장", description = "기상청 API로부터 최신 서울(중구) 날씨를 조회")
    @GetMapping("/seoul")
    public ResponseEntity<WeatherResponseDto> getSeoulWeather() {
        WeatherResponseDto result = weatherService.fetchAndSaveSeoulWeather();
        return ResponseEntity.ok(result);
    }
}
