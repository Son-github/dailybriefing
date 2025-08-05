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
import java.util.Map;
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
        List<NewsItem> newsList = RssParser.fetchNewsWithLinks(rssUrl);
        if (newsList.isEmpty()) {
            return NewsResponse.builder()
                    .topNews(List.of(new NewsItem("뉴스를 불러오지 못했습니다.", null, null, "Neutral")))
                    .build();
        }

        List<NewsItem> analyzedNews = newsList;
        String overallSentiment = "Neutral";
        try {
            analyzedNews = webClientBuilder.build()
                    .post()
                    .uri(pythonServiceUrl + "/analyze-multiple")
                    .bodyValue(newsList) // 이제 title + content 함께 전송
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<List<NewsItem>>() {})
                    .block();

            overallSentiment = analyzedNews.stream()
                    .collect(Collectors.groupingBy(NewsItem::getSentiment, Collectors.counting()))
                    .entrySet()
                    .stream()
                    .max((a, b) -> Long.compare(a.getValue(), b.getValue()))
                    .map(Map.Entry::getKey)
                    .orElse("Neutral");
        } catch (Exception e) {
            System.err.println("감성분석 실패: " + e.getMessage());
        }

        repository.save(NewsLog.builder()
                .query("google-news-top10")
                .result(String.join(",", analyzedNews.stream().map(NewsItem::getTitle).toList()))
                .sentiment(overallSentiment)
                .createdAt(LocalDateTime.now())
                .build());

        return NewsResponse.builder()
                .topNews(analyzedNews)
                .build();
    }
}
