package com.sonny.weatherservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Builder
public class WeatherResponseDto {
    private String city;
    private String weather;
    private double temperature;
}
