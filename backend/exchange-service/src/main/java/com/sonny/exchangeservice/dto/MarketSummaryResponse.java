package com.sonny.exchangeservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MarketSummaryResponse {

    private Double usdKrw;
    private Double usdKrwChangeRate;

    private Double kospi;
    private Double kospiChangeRate;

    private Double kosdaq;
    private Double kosdaqChangeRate;

    private Double nasdaq;
    private Double nasdaqChangeRate;

    private String fetchedDate;
    private String updatedAt;
    private boolean stale;
}
