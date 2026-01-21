package com.sonny.newsservice.repository;

import com.sonny.newsservice.domain.FetchRun;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface FetchRunRepository extends JpaRepository<FetchRun, Long> {
    Optional<FetchRun> findTopByOrderByFetchedAtDesc();
    Optional<FetchRun> findTopByIdLessThanOrderByFetchedAtDesc(Long id);
}
