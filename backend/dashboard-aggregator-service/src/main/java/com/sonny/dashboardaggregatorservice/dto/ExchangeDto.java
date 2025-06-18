package com.sonny.dashboardaggregatorservice.dto;

import java.util.Map;

public record ExchangeDto (String baseCurrency, Map<String, Double> rates, String date) {
}
