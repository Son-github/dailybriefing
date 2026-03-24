package com.sonny.exchangeservice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class AlphaVantageQuoteResponse {

    @JsonProperty("Global Quote")
    private GlobalQuote globalQuote;

    @Getter
    @NoArgsConstructor
    public static class GlobalQuote {

        @JsonProperty("01. symbol")
        private String symbol;

        @JsonProperty("05. price")
        private String price;

        @JsonProperty("09. change")
        private String change;

        @JsonProperty("10. change percent")
        private String changePercent;
    }
}
