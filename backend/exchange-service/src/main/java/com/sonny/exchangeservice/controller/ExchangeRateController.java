package com.sonny.exchangeservice.controller;

import com.sonny.exchangeservice.dto.ExchangeRateDto;
import com.sonny.exchangeservice.service.ExchangeRateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/exchange")
@RequiredArgsConstructor
@Tag(name = "환율 API", description = "한국과 미국 간의 고정 환율 정보 조회")
public class ExchangeRateController {

    private final ExchangeRateService exchangeRateService;

    @Operation(summary = "기준 통화 환율 조회", description = "USD 등의 기준 통화에 대한 KRW 환율을 반환합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "성공"),
            @ApiResponse(responseCode = "400", description = "잘못된 요청"),
            @ApiResponse(responseCode = "500", description = "서버 오류")
    })
    @GetMapping()
    public ResponseEntity<ExchangeRateDto> getUsdToKrwRate() {
        ExchangeRateDto rateDto = exchangeRateService.getLatestRate("USD");
        return ResponseEntity.ok(rateDto);
    }
}

