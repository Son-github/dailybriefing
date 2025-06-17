package com.sonny.weatherservice.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Getter @Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Weather {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "city", nullable = false, length = 100)
    private String city;

    @Column(name = "description", nullable = false)
    private String description;

    @Column(name = "temperature", nullable = false, length = 10)
    private Double temperature;

    @Column(name = "fetchedAt")
    private LocalDateTime fetchedAt;
}
