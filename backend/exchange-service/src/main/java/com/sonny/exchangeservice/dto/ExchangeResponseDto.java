package com.sonny.exchangeservice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
public class ExchangeResponseDto {

    @JsonProperty("cur_unit")
    private String currencyUnit;

    @JsonProperty("deal_bas_r")
    private String dealBasR;
}
// 무엇?