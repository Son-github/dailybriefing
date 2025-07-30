package com.sonny.weatherservice.dto;

import lombok.Data;

@Data
public class WeatherResponse {
    private String baseDate;
    private String baseTime;
    private String category;
    private String fcstDate;
    private String fcstTime;
    private String fcstValue;
    private String nx;
    private String ny;
}
