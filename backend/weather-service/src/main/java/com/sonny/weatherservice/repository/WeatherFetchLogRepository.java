package com.sonny.weatherservice.repository;

import com.sonny.weatherservice.domain.WeatherFetchLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WeatherFetchLogRepository extends JpaRepository<WeatherFetchLog, Long> {
}
