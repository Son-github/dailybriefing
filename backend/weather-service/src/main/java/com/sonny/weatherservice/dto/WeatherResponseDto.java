package com.sonny.weatherservice.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WeatherResponseDto {
    private String location;
    private double temperature;
    private String rainType; // sky → rainType
    private int humidity;
    private LocalDateTime updateAt;
}

