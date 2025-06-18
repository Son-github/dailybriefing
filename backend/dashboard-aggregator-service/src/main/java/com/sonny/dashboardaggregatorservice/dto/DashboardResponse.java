package com.sonny.dashboardaggregatorservice.dto;

import java.util.List;

public record DashboardResponse(String status,
                                ExchangeDto exchange,
                                StockDto stock,
                                WeatherDto weather,
                                AirQualityDto airQuality,
                                List<NewsDto> news,
                                String timestamp) {
}
