package com.sonny.exchangeservice.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@IdClass(ExchangeLastSeenId.class)
public class ExchangeLastSeen {

    @Id
    @Column(nullable = false, length = 80)
    private String userId;

    @Id
    @Column(nullable = false, length = 10)
    private String baseCurrency;

    @Id
    @Column(nullable = false, length = 10)
    private String targetCurrency;

    @Column(nullable = false)
    private Double lastSeenRate;

    @Column(nullable = false)
    private LocalDateTime lastSeenAt;

    @Column(nullable = false)
    private LocalDate lastFetchedDate;
}
