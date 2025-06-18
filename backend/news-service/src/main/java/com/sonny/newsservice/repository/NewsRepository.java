package com.sonny.newsservice.repository;

import com.sonny.newsservice.domain.News;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NewsRepository extends JpaRepository<News, Long> {
    Optional<News> findTop1ByOrderByCreatedAtDesc();
}
