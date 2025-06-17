package com.sonny.stockservice.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Stock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 20, nullable = false)
    private String indexName;

    @Column(length = 10, nullable = false)
    private String symbol;

    @Column(nullable = false)
    private double price;

    @Column(nullable = false)
    private double changeAmount;

    @Column(length = 10, nullable = false)
    private String changeRate;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
    }

}
