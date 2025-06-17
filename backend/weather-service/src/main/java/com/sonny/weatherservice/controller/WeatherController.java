package com.sonny.weatherservice.controller;

import com.sonny.weatherservice.dto.WeatherResponseDto;
import com.sonny.weatherservice.service.WeatherService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard/weather")
@RequiredArgsConstructor
public class WeatherController {

    private final WeatherService weatherService;

    @GetMapping("/{city}")
    public WeatherResponseDto getWeather(@PathVariable String city) {
        return weatherService.getCurrentWeather(city);
    }
}
