package com.sonny.exchangeservice.domain;

import lombok.*;

import java.io.Serializable;

@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class ExchangeLastSeenId implements Serializable {
    private String userId;
    private String baseCurrency;
    private String targetCurrency;
}
