package com.sonny.backend.domain.user.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.ZonedDateTime;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ExchangeRateHistoryDto {
    private String baseCurrency;
    private String targetCurrency;
    private BigDecimal rate;
    private ZonedDateTime recordedAt;
}
