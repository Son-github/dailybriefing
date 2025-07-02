package com.sonny.exchangeservice.repository;


import com.sonny.exchangeservice.domain.ExchangeRate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

public interface ExchangeRateRepository extends JpaRepository<ExchangeRate, UUID> {
    Optional<ExchangeRate> findByBaseCurrencyAndTargetCurrencyAndFetchedDate(
            String baseCurrency, String targetCurrency, LocalDate fetchedDate);
}