package com.sonny.backend.domain.user.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.ZonedDateTime;

@Entity
@Table(name = "exchange_rates", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"base_currency", "target_currency", "fetched_at"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExchangeRate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long rateId;

    @Column(name = "base_currency", length = 3, nullable = false)
    private String baseCurrency;

    @Column(name = "target_currency", length = 3, nullable = false)
    private String targetCurrency;

    @Column(nullable = false, precision = 18, scale = 6)
    private BigDecimal rate;

    @Column(name = "fetched_at", nullable = false)
    private ZonedDateTime fetchedAt;
}
