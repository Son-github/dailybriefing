package com.sonny.weatherservice.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "weather")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Weather {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String baseDate; // 발표날짜
    private String baseTime; // 발표시각
    private String category; // 항목
    private String fcstDate; // 예측 날짜
    private String fcstTime; // 예측 시각
    private String fcstValue; // 예측 값
    private String nx;
    private String ny;
}
