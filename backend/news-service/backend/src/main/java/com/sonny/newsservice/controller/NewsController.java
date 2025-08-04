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

    @GetMapping("/news/fetch")
    public NewsResponse getNews() {
        return newsService.fetchNewsSummary();
    }

}
