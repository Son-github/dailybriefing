package com.sonny.newsservice.service;

import com.sonny.newsservice.domain.NewsLog;
import com.sonny.newsservice.dto.NewsResponse;
import com.sonny.newsservice.repository.NewsLogRepository;
import com.sonny.newsservice.util.RssParser;
import lombok.RequiredArgsConstructor;
import lombok.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NewsService {

    private final NewsLogRepository repository;
    private final WebClient.Builder webClientBuilder;

    @Value("${external.rss-url}")
    private String rssUrl;

    @Value("${external.python-service-url}")
    private String pythonServiceUrl;

    public NewsResponse fetchNewsSummary() {
        // 1. 뉴스 수집
        List<String> newsList = RssParser.fetchNewsTitles(rssUrl);
        if (newsList.isEmpty()) {
            return NewsResponse.builder()
                    .topNews(List.of("뉴스를 불러오지 못했습니다."))
                    .sentiment("Neutral")
                    .build();
        }

        // 2. 감성 분석
        String sentiment = "Neutral";
        try {
            sentiment = webClientBuilder.build()
                    .post()
                    .uri(pythonServiceUrl)
                    .bodyValue(newsList)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
        } catch (Exception e) {
            System.err.println("감성분석 실패: " + e.getMessage());
        }

        // 3. 로그 저장
        try {
            NewsLog log = NewsLog.builder()
                    .query("google-news-top10")
                    .result(String.join(",", newsList))
                    .sentiment(sentiment)
                    .createdAt(LocalDateTime.now())
                    .build();
            repository.save(log);
        } catch (Exception e) {
            System.err.println("DB 저장 실패: " + e.getMessage());
        }

        // 4. 응답
        return NewsResponse.builder()
                .topNews(newsList)
                .sentiment(sentiment)
                .build();
    }
}
