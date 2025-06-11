package com.sonny.backend.domain.user.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.ZonedDateTime;

/* 지수 이력*/
@Entity
@Table(name = "stock_index_history", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"index_code", "recorded_at"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockIndexHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long historyId;

    @Column(name = "index_code", length = 20, nullable = false)
    private String indexCode;

    @Column(name = "index_name", length = 100, nullable = false)
    private String indexName;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal value;

    @Column(name = "change_rate", precision = 6, scale = 2)
    private BigDecimal changeRate;

    @Column(name = "recorded_at", nullable = false)
    private ZonedDateTime recordedAt;
}
