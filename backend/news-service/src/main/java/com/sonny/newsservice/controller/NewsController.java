package com.sonny.newsservice.controller;

import com.sonny.newsservice.service.NewsService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard/news")
@RequiredArgsConstructor
public class NewsController {

    private final NewsService newsService;

    @GetMapping("/today")
    @Operation(summary = "오늘의 뉴스 요약 요청", description = "ChatGPT를 통해 실시간으로 오늘의 뉴스 TOP10을 요약받고 DB에 저장합니다.")
    public String getTodayNews() {
        return newsService.getTodayNewsSummary();
    }

    @GetMapping("/latest")
    @Operation(summary = "최신 뉴스 요약 조회", description = "DB에 저장된 최신 뉴스 요약 내용을 반환합니다.")
    public String getLatestCachedNews() {
        return newsService.getLatestSummaryFromDB();
    }
}
