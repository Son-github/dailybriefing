package com.sonny.exchangeservice.repository;


import com.sonny.exchangeservice.domain.ExchangeRate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface ExchangeRateRepository extends JpaRepository<ExchangeRate, UUID> {
    Optional<ExchangeRate> findTopByBaseCurrencyAndTargetCurrencyAndFetchedAtAfterOrderByFetchedAtDesc(
            String baseCurrency,
            String targetCurrency,
            LocalDateTime fetchedAt
    );
}