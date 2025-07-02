package com.sonny.exchangeservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

public record ExchangeRateDto(
        String baseCurrency,
        String targetCurrency,
        Double rate,
        String fetchedDate
) {}


/* class 대신 record를 쓰는 이유는 단순히 값만 전달하는 단순 응답 DTO이기 때문에
*  equals, hashCode, toString 자동 생성
*  생성자, getter 자동 생성
*  불변이라서 안정적 (객체 수정 위험 없음)
*  코드 양 적고 직관적
*  이러한 장점들이 있음
*  but 세밀한 Setter, builder, jsonproperty, jsonignore, binding 대상일 때에은 class를 써야함
* */
