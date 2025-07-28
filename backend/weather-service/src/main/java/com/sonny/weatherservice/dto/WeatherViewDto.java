package com.sonny.weatherservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@AllArgsConstructor
public class WeatherViewDto {
    private String fcstDate;
    private String fcstTime;
    private String category;
    private String value;
}

