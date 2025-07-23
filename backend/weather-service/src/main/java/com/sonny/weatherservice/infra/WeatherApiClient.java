package com.sonny.weatherservice.infra;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

@Slf4j
@Component
@RequiredArgsConstructor
public class WeatherApiClient {

    @Value("${external.weather.service-key}")
    private String apiKey;

    private final WebClient webClient = WebClient.builder()
            .baseUrl("http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0")
            .build();

    public String fetchUltraSrtFcst(String baseDate, String baseTime, String nx, String ny) {
        String url = "/getUltraSrtFcst";
        log.info("[WeatherApiClient] 요청: {} base_date={} base_time={} nx={} ny={}", url, baseDate, baseTime, nx, ny);

        return webClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path(url)
                        .queryParam("serviceKey", apiKey)
                        .queryParam("numOfRows", 10)
                        .queryParam("pageNo", 1)
                        .queryParam("dataType", "JSON")
                        .queryParam("base_date", baseDate)
                        .queryParam("base_time", baseTime)
                        .queryParam("nx", nx)
                        .queryParam("ny", ny)
                        .build())
                .retrieve()
                .onStatus(status -> status.value() != 200, clientResponse -> {
                    log.error("[WeatherApiClient] API Status Error: {}", clientResponse.statusCode());
                    return clientResponse.createException();
                })
                .bodyToMono(String.class)
                .doOnNext(body -> log.debug("[WeatherApiClient] 응답: {}", body))
                .block();
    }
}

