package com.sonny.weatherservice.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "external.weather")
@Getter
@Setter
public class WeatherConfig {
    private String apiUrl;
    private String serviceKey;
}