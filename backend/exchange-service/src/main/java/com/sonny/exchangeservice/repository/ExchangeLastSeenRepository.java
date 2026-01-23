package com.sonny.exchangeservice.repository;

import com.sonny.exchangeservice.domain.ExchangeLastSeen;
import com.sonny.exchangeservice.domain.ExchangeLastSeenId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ExchangeLastSeenRepository extends JpaRepository<ExchangeLastSeen, ExchangeLastSeenId> {
    Optional<ExchangeLastSeen> findByUserIdAndBaseCurrencyAndTargetCurrency(String userId, String baseCurrency, String targetCurrency);
}
