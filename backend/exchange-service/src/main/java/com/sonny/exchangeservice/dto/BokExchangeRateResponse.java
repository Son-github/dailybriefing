package com.sonny.exchangeservice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
public class BokExchangeRateResponse {

    // ECOS 응답의 최상위 키가 보통 StatisticSearch
    @JsonProperty("StatisticSearch")
    private StatisticSearch statisticSearch;

    @Getter
    @NoArgsConstructor
    public static class StatisticSearch {
        private List<Row> row;
    }

    @Getter
    @NoArgsConstructor
    public static class Row {

        // 시점 (예: 20260312)
        @JsonProperty("TIME")
        private String time;

        // 값 (예: 1327.40)
        @JsonProperty("DATA_VALUE")
        private String dataValue;

        // 필요 시 추가로 쓸 수 있음
        @JsonProperty("STAT_CODE")
        private String statCode;

        @JsonProperty("ITEM_CODE1")
        private String itemCode1;
    }
}