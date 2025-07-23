package com.sonny.weatherservice.repository;

import com.sonny.weatherservice.domain.Weather;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface WeatherRepository extends JpaRepository<Weather, Long> {
    List<Weather> findByFcstDate(String fcstDate);
}
