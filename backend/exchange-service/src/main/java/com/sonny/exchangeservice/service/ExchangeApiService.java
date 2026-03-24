package com.sonny.exchangeservice.service;

import com.sonny.exchangeservice.dto.AlphaVantageQuoteResponse;
import com.sonny.exchangeservice.dto.BokExchangeRateResponse;
import com.sonny.exchangeservice.dto.KisIndexResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

@Service
@RequiredArgsConstructor
public class ExchangeApiService {

    private final WebClient webClient;

    @Value("${api.bok.key}")
    private String bokApiKey;

    @Value("${api.alpha.key}")
    private String alphaApiKey;

    public Double getUsdKrw() {
        BokExchangeRateResponse response = webClient.get()
                .uri("https://ecos.bok.or.kr/api/StatisticSearch/" +
                        bokApiKey +
                        "/json/kr/1/1/036Y001/DD/20260312/20260312/0000001")
                .retrieve()
                .bodyToMono(BokExchangeRateResponse.class)
                .block();

        if (response == null ||
                response.getStatisticSearch() == null ||
                response.getStatisticSearch().getRow() == null ||
                response.getStatisticSearch().getRow().isEmpty()) {
            return null;
        }

        return Double.parseDouble(
                response.getStatisticSearch()
                        .getRow()
                        .get(0)
                        .getDataValue()
        );
    }

    public Double getNasdaq() {
        AlphaVantageQuoteResponse response = webClient.get()
                .uri(uriBuilder -> uriBuilder
                        .scheme("https")
                        .host("www.alphavantage.co")
                        .path("/query")
                        .queryParam("function", "GLOBAL_QUOTE")
                        .queryParam("symbol", "QQQ")
                        .queryParam("apikey", alphaApiKey)
                        .build())
                .retrieve()
                .bodyToMono(AlphaVantageQuoteResponse.class)
                .block();

        if (response == null || response.getGlobalQuote() == null) {
            return null;
        }

        return Double.parseDouble(response.getGlobalQuote().getPrice());
    }

    public Double getKospi() {
        // KIS 연결 전 임시값
        return 2635.12;
    }

    public Double getKosdaq() {
        // KIS 연결 전 임시값
        return 812.43;
    }
}
