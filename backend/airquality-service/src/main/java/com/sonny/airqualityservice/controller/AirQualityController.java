package com.sonny.airqualityservice.controller;

import com.sonny.airqualityservice.dto.AirQualityDto;
import com.sonny.airqualityservice.service.AirQualityService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/dashboard/air")
@RequiredArgsConstructor
public class AirQualityController {

    private final AirQualityService airQualityService;

    @GetMapping("/{city}")
    public ResponseEntity<?> getAirQuality(@PathVariable String city) {
        AirQualityDto result = airQualityService.getAirQuality(city);
        return ResponseEntity.ok(Map.of("status", "success", "data", result));
    }
}
