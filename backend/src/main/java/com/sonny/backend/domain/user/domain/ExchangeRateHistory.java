package com.sonny.backend.domain.user.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.ZonedDateTime;

/* 환율 이력*/
@Entity
@Table(name = "exchange_rate_history", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"base_currency", "target_currency", "recorded_at"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExchangeRateHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long historyId;

    @Column(name = "base_currency", length = 3, nullable = false)
    private String baseCurrency;

    @Column(name = "target_currency", length = 3, nullable = false)
    private String targetCurrency;

    @Column(nullable = false, precision = 18, scale = 6)
    private BigDecimal rate;

    @Column(name = "recorded_at", nullable = false)
    private ZonedDateTime recordedAt;
}
