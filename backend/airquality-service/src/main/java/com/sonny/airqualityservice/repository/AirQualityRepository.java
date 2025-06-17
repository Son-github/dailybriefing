package com.sonny.airqualityservice.repository;

import com.sonny.airqualityservice.domain.AirQuality;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AirQualityRepository extends JpaRepository<AirQuality, Long> {
}
