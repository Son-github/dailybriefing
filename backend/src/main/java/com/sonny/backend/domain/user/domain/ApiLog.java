package com.sonny.backend.domain.user.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.ZonedDateTime;

/* api log */
@Entity
@Table(name = "api_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApiLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long logId;

    @Column(name = "api_name", length = 100, nullable = false)
    private String apiName;

    @Column(name = "status_code", nullable = false)
    private Integer statusCode;

    @Column(name = "response_time_ms")
    private Integer responseTimeMs;

    @Column(name = "called_at")
    private ZonedDateTime calledAt = ZonedDateTime.now();

    @Column(name = "error_massage", columnDefinition = "TEXT")
    private String errorMessage;
}
