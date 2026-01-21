package com.sonny.newsservice.repository;

import com.sonny.newsservice.domain.FetchRun;
import com.sonny.newsservice.domain.KeywordStat;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface KeywordStatRepository extends JpaRepository<KeywordStat, Long> {
    List<KeywordStat> findByFetchRun(FetchRun fetchRun);
}
