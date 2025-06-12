package com.sonny.backend.domain.user.repository;

import com.sonny.backend.domain.user.domain.ApiLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ApiLogRepository extends JpaRepository<ApiLog,Integer> {
}
