package com.sonny.newsservice.controller;

import com.sonny.newsservice.dto.NewsResponse;
import com.sonny.newsservice.service.NewsService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class NewsController {

    private final NewsService newsService;

    // 뉴스 요약 + 감성 분석 결과 반환
    @GetMapping("/news/fetch")
    public NewsResponse fetchNews() {
        return newsService.fetchNewsSummary();
    }
}
