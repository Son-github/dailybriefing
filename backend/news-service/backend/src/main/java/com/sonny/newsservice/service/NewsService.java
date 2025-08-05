package com.sonny.newsservice.service;

import com.sonny.newsservice.domain.NewsLog;
import com.sonny.newsservice.dto.NewsItem;
import com.sonny.newsservice.dto.NewsResponse;
import com.sonny.newsservice.repository.NewsLogRepository;
import com.sonny.newsservice.util.RssParser;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

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
        // 1. 뉴스 수집 (제목 + 링크)
        List<NewsItem> newsList = RssParser.fetchNewsWithLinks(rssUrl);
        if (newsList.isEmpty()) {
            return NewsResponse.builder()
                    .topNews(List.of(new NewsItem("뉴스를 불러오지 못했습니다.", null, "Neutral")))
                    .sentiment("Neutral")
                    .build();
        }

        // 2. KoBERT 감성 분석 요청
        List<NewsItem> analyzedNews = newsList;
        String overallSentiment = "Neutral";
        try {
            analyzedNews = webClientBuilder.build()
                    .post()
                    .uri(pythonServiceUrl + "/analyze-multiple")
                    .bodyValue(newsList)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<List<NewsItem>>() {})
                    .block();

            // 전체 뉴스 평균 감성 계산 (단순히 가장 많이 나온 감성으로)
            overallSentiment = analyzedNews.stream()
                    .collect(Collectors.groupingBy(NewsItem::getSentiment, Collectors.counting()))
                    .entrySet()
                    .stream()
                    .max((a, b) -> Long.compare(a.getValue(), b.getValue()))
                    .map(e -> e.getKey())
                    .orElse("Neutral");
        } catch (Exception e) {
            System.err.println("감성분석 실패: " + e.getMessage());
        }

        // 3. 로그 저장
        try {
            NewsLog log = NewsLog.builder()
                    .query("google-news-top10")
                    .result(String.join(",", analyzedNews.stream().map(NewsItem::getTitle).toList()))
                    .sentiment(overallSentiment)
                    .createdAt(LocalDateTime.now())
                    .build();
            repository.save(log);
        } catch (Exception e) {
            System.err.println("DB 저장 실패: " + e.getMessage());
        }

        // 4. 응답
        return NewsResponse.builder()
                .topNews(analyzedNews)
                .sentiment(overallSentiment)
                .build();
    }
}
