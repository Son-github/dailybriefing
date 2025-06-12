package com.sonny.backend.domain.user.repository;

import com.sonny.backend.domain.user.domain.StockIndex;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StockIndexRepository extends JpaRepository<StockIndex,Integer> {
}
