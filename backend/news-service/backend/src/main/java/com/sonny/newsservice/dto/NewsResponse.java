package com.sonny.newsservice.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class NewsResponse {
    private List<NewsItem> topNews;   // 뉴스 제목 + 링크 + 개별 감성
    private String sentiment;         // 전체 뉴스의 종합 감성
}

