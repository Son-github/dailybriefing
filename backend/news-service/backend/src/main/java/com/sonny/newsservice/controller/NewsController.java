package com.sonny.newsservice.controller;

import com.sonny.newsservice.dto.NewsResponse;
import com.sonny.newsservice.service.NewsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@Tag(name = "News API", description = "뉴스 관련 API")
public class NewsController {

    private final NewsService newsService;

    @Operation(summary = "최신 뉴스 10개와 감성 분석 결과 조회")
    @GetMapping("/news/fetch")
    public NewsResponse getNews() {
        return newsService.fetchNewsSummary();
    }
}
