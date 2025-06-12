package com.sonny.backend.domain.user.repository;

import com.sonny.backend.domain.user.domain.StockIndexHistory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StockIndexHistoryRepository extends JpaRepository<StockIndexHistory,Integer> {
}
