package com.sonny.exchangeservice.controller;

import com.sonny.exchangeservice.dto.ExchangeRateDto;
import com.sonny.exchangeservice.service.ExchangeRateService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/exchange")
@RequiredArgsConstructor
@Tag(name = "환율 API", description = "한국과 미국 간의 고정 환율 정보 조회")
public class ExchangeRateController {

    private final ExchangeRateService exchangeRateService;

    @GetMapping
    public ResponseEntity<ExchangeRateDto> getUsdRate(
            @RequestHeader(value = "X-USER-ID", required = false) String userId
    ) {
        try {
            log.info("환율 호출 성공");
            // ✅ userId 없으면 “anonymous”로 처리(로컬/테스트용)
            String resolvedUserId = (userId == null || userId.isBlank()) ? "anonymous" : userId;

            ExchangeRateDto dto = exchangeRateService.getLatestRateWithLastSeen(resolvedUserId);
            return ResponseEntity.ok(dto);
        } catch (RuntimeException e) {
            log.error("환율 조회 실패: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
}
