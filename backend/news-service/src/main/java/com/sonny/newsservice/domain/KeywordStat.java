package com.sonny.newsservice.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Table(
        name = "keyword_stats",
        indexes = { @Index(name = "idx_keyword_stats_run", columnList = "fetch_run_id") }
)
public class KeywordStat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "fetch_run_id")
    private FetchRun fetchRun;

    @Column(nullable = false, length = 100)
    private String keyword;

    @Column(nullable = false)
    private int count;
}
