package com.sonny.stockservice.dto;

import lombok.Data;

@Data
public class ExternalStockResponse {
    private String symbol;
    private double price;
    private double change;
    private String changePercent;
    private String timestamp;
}
