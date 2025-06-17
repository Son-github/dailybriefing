package com.sonny.exchangeservice.repository;

import com.sonny.exchangeservice.domain.ExchangeRate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ExchangeRateRepository extends JpaRepository<ExchangeRate, Long> {
    Optional<ExchangeRate> findTopByBaseCurrencyAndTargetCurrencyOrderByFetchedAtDesc(String baseCurrency, String targetCurrency);
}
