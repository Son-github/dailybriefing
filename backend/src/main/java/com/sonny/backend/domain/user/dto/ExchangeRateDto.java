package com.sonny.backend.domain.user.dto;


import lombok.*;

import java.math.BigDecimal;
import java.time.ZonedDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExchangeRateDto {
    private String baseCurrency;
    private String targetCurrency;
    private BigDecimal rate;
    private ZonedDateTime fetchedAt;
}
