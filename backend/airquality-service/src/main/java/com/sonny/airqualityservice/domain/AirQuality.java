package com.sonny.airqualityservice.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AirQuality {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "city", nullable = false, length = 100)
    private String city;

    @Column(name = "data_time", nullable = false, length = 50)
    private String dataTime;

    @Column(name = "pm10",  nullable = false, length = 50)
    private double pm10;

    @Column(name = "pm25", nullable = false, length = 50)
    private double pm25;
}
