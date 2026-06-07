package com.sonny.exchangeservice.service;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Slf4j
@Service
@RequiredArgsConstructor
public class ExchangeApiService {

    private final WebClient webClient;

    @Value("${external.exchange.api-url}")
    private String koreaEximUrl;
    @Value("${external.exchange.service-key:}")
    private String koreaEximKey;
    @Value("${external.exchange.data:AP01}")
    private String koreaEximDataCode;

    @Value("${external.kis.base-url:https://openapi.koreainvestment.com:9443}")
    private String kisBaseUrl;
    @Value("${external.kis.app-key:}")
    private String kisAppKey;
    @Value("${external.kis.app-secret:}")
    private String kisAppSecret;

    @Value("${external.twelve-data.base-url:https://api.twelvedata.com}")
    private String twelveDataBaseUrl;
    @Value("${external.twelve-data.api-key:}")
    private String twelveDataApiKey;
    @Value("${external.twelve-data.symbol:IXIC}")
    private String twelveDataSymbol;

    public MarketValue getUsdKrw() {
        if (!StringUtils.hasText(koreaEximKey)) return MarketValue.empty();

        // 이전 ECOS 날짜 하드코딩 방식 대신, 수출입은행의 최근 영업일 고시 환율을 최대 7일 역추적한다.
        for (int daysAgo = 0; daysAgo < 7; daysAgo++) {
            String searchDate = LocalDate.now().minusDays(daysAgo).format(DateTimeFormatter.BASIC_ISO_DATE);
            try {
                JsonNode rows = webClient.get()
                        .uri(UriComponentsBuilder.fromHttpUrl(koreaEximUrl)
                                .queryParam("authkey", koreaEximKey)
                                .queryParam("searchdate", searchDate)
                                .queryParam("data", koreaEximDataCode)
                                .build(true).toUri())
                        .retrieve()
                        .bodyToMono(JsonNode.class)
                        .block();

                if (rows == null || !rows.isArray()) continue;
                for (JsonNode row : rows) {
                    if ("USD".equals(row.path("cur_unit").asText())) {
                        return new MarketValue(parseNumber(row.path("deal_bas_r").asText()), null, searchDate);
                    }
                }
            } catch (Exception e) {
                log.warn("Korea Exim exchange request failed for {}: {}", searchDate, e.getMessage());
            }
        }
        return MarketValue.empty();
    }

    public MarketValue getKospi() {
        return getKisIndex("0001");
    }

    public MarketValue getKosdaq() {
        return getKisIndex("1001");
    }

    public MarketValue getNasdaq() {
        if (!StringUtils.hasText(twelveDataApiKey)) return MarketValue.empty();
        try {
            JsonNode response = webClient.get()
                    .uri(UriComponentsBuilder.fromHttpUrl(twelveDataBaseUrl + "/quote")
                            .queryParam("symbol", twelveDataSymbol)
                            .queryParam("apikey", twelveDataApiKey)
                            .build(true).toUri())
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();
            if (response == null || response.hasNonNull("status") && "error".equals(response.path("status").asText())) {
                return MarketValue.empty();
            }
            return new MarketValue(
                    parseNumber(response.path("close").asText()),
                    parseNumber(response.path("percent_change").asText()),
                    response.path("datetime").asText(null)
            );
        } catch (Exception e) {
            log.warn("Twelve Data request failed: {}", e.getMessage());
            return MarketValue.empty();
        }
    }

    private MarketValue getKisIndex(String indexCode) {
        if (!StringUtils.hasText(kisAppKey) || !StringUtils.hasText(kisAppSecret)) return MarketValue.empty();
        try {
            String token = issueKisAccessToken();
            JsonNode response = webClient.get()
                    .uri(UriComponentsBuilder.fromHttpUrl(kisBaseUrl + "/uapi/domestic-stock/v1/quotations/inquire-index-price")
                            .queryParam("FID_COND_MRKT_DIV_CODE", "U")
                            .queryParam("FID_INPUT_ISCD", indexCode)
                            .build(true).toUri())
                    .header("authorization", "Bearer " + token)
                    .header("appkey", kisAppKey)
                    .header("appsecret", kisAppSecret)
                    .header("tr_id", "FHPUP02100000")
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            JsonNode output = response == null ? null : response.path("output");
            if (output == null || output.isMissingNode()) return MarketValue.empty();
            return new MarketValue(
                    parseNumber(output.path("bstp_nmix_prpr").asText()),
                    parseNumber(output.path("prdy_ctrt").asText()),
                    LocalDate.now().toString()
            );
        } catch (Exception e) {
            log.warn("KIS index request failed for {}: {}", indexCode, e.getMessage());
            return MarketValue.empty();
        }
    }

    private String issueKisAccessToken() {
        JsonNode response = webClient.post()
                .uri(kisBaseUrl + "/oauth2/tokenP")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(new KisTokenRequest("client_credentials", kisAppKey, kisAppSecret))
                .retrieve()
                .bodyToMono(JsonNode.class)
                .block();
        String token = response == null ? null : response.path("access_token").asText(null);
        if (!StringUtils.hasText(token)) throw new IllegalStateException("KIS access token missing");
        return token;
    }

    private Double parseNumber(String value) {
        if (!StringUtils.hasText(value)) return null;
        try {
            return Double.parseDouble(value.replace(",", "").replace("%", "").trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private record KisTokenRequest(String grant_type, String appkey, String appsecret) {}

    public record MarketValue(Double value, Double changeRate, String fetchedDate) {
        public static MarketValue empty() {
            return new MarketValue(null, null, null);
        }
    }
}
