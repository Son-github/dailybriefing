package com.sonny.newsservice.controller;

import com.sonny.newsservice.dto.NewsBriefResponse;
import com.sonny.newsservice.service.NewsFacadeService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/news")
public class NewsController {

    private final NewsFacadeService newsFacadeService;

    @GetMapping("/brief")
    public NewsBriefResponse brief() {
        return newsFacadeService.fetchBrief();
    }
}
