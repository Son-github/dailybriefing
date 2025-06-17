package com.sonny.airqualityservice.service;

import com.sonny.airqualityservice.domain.AirQuality;
import com.sonny.airqualityservice.dto.AirQualityDto;
import com.sonny.airqualityservice.repository.AirQualityRepository;
import lombok.RequiredArgsConstructor;
import lombok.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

@Service
@RequiredArgsConstructor
public class AirQualityService {

    private final WebClient webClient;
    private final AirQualityRepository airQualityRepository;

    @Value("${air.api.url}")
    private String apiUrl;

    @Value("${air.api.key}")
    private String apiKey;

    public AirQualityDto getAirQuality(String city) {
        String url = apiUrl + "?city=" + city + "&key=" + apiKey;

        AirQualityDto dto = webClient.get()
                .uri(url)
                .retrieve()
                .bodyToMono(AirQualityDto.class)
                .block();

        if (dto != null) {
            airQualityRepository.save(AirQuality.builder()
                            .city(dto.getCity())
                            .dataTime(dto.getDataTime())
                            .pm10(dto.getPm10())
                            .pm25(dto.getPm25())
                            .build());
        }

        return dto;
    }
}
