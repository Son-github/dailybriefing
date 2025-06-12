package com.sonny.backend.domain.user.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.ZonedDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockIndexDto {
    private String indexName;
    private BigDecimal value;
    private BigDecimal changeRate;
    private ZonedDateTime fetchedAt;
}
