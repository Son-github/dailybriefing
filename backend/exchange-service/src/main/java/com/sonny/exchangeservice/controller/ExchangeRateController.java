package com.sonny.exchangeservice.controller;

import com.sonny.exchangeservice.dto.ExchangeRateDto;
import com.sonny.exchangeservice.service.ExchangeRateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/exchange")
@RequiredArgsConstructor
@Tag(name = "환율 API", description = "한국과 미국 간의 고정 환율 정보 조회")
public class ExchangeRateController {

    private final ExchangeRateService exchangeRateService;

    @Operation(summary = "USD-KRW 환율 조회", description = "기본 미국 달러(USD) 기준의 원화(KRW) 환율을 조회합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "조회 성공",
                    content = @Content(schema = @Schema(implementation = ExchangeRateDto.class))),
            @ApiResponse(responseCode = "400", description = "요청 오류")
    })
    @GetMapping
    public ResponseEntity<ExchangeRateDto> getUsdRate() {
        try {
            ExchangeRateDto dto = exchangeRateService.getLatestRate();
            return ResponseEntity.ok(dto);
        } catch (RuntimeException e) {
            log.error("환율 조회 실패: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
}

