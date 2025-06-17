package com.sonny.stockservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class StockDto {
    private String indexName;
    private double price;
    private String changeRate;
    private String timestamp;
}
