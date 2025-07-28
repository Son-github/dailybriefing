package com.sonny.weatherservice.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Weather {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String fcstDate;   // yyyyMMdd
    private String fcstTime;   // HHmm
    private String category;   // TMP 등
    private String value;      // 값
}
