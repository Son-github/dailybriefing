package com.sonny.exchangeservice.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.GenericGenerator;
import org.springframework.data.annotation.CreatedDate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExchangeRate {

    @Id
    @GeneratedValue(generator = "uuid2")
    @GenericGenerator(name = "uuid2", strategy = "uuid2")
    private UUID id;

    @Column(nullable = false)
    private String baseCurrency;

    @Column(nullable = false)
    private String targetCurrency;

    @Column(nullable = false)
    private Double rate;

    @Column(nullable = false)
    private LocalDate fetchedDate;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
