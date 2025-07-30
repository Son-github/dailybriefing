package com.sonny.weatherservice.controller;

import com.sonny.weatherservice.dto.WeatherResponse;
import com.sonny.weatherservice.service.WeatherService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/weather")
public class WeatherController {
    private final WeatherService weatherService;

    @GetMapping("/raw")
    public String getWeatherRaw() {
        return weatherService.getCurrentWeather();
    }
}

