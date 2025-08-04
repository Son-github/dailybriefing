package com.sonny.newsservice.repository;

import com.sonny.newsservice.domain.NewsLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface NewsLogRepository extends JpaRepository<NewsLog,Long> {
}
