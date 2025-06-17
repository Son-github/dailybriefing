package com.sonny.airqualityservice.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AirQualityDto {
    private String city;
    private String dataTime;
    private double pm10;
    private double pm25;
}
