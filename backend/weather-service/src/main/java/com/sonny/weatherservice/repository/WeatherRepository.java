package com.sonny.weatherservice.repository;

import com.sonny.weatherservice.domain.Weather;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface WeatherRepository extends JpaRepository<Weather, UUID> {
    Optional<Weather> findTopByLocationOrderByUpdateAtDesc(String location);
}
