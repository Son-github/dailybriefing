package com.sonny.newsservice.controller;

import com.sonny.newsservice.service.NewsService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;

import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(NewsController.class)
class NewsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private NewsService newsService;

    @Test
    @DisplayName("GET /api/news/latest - 뉴스 요약 응답")
    void getLatestSummary_success() throws Exception {
        String mockSummary = "1. 대통령 해외 순방\n2. 코스피 상승세…";

        when(newsService.getLatestSummaryFromDB()).thenReturn(mockSummary);

        mockMvc.perform(get("/api/news/latest"))
                .andExpect(status().isOk())
                .andExpect(content().string(mockSummary));
    }
}