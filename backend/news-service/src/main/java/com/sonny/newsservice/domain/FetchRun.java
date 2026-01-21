package com.sonny.newsservice.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Table(name = "fetch_runs")
public class FetchRun {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private OffsetDateTime fetchedAt;

    @Column(nullable = false, length = 500)
    private String sourceUrl;

    @Column(nullable = false)
    private int itemCount;
}
