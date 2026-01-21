package com.sonny.newsservice.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;

@Component
public class NlpClient {

    private final WebClient webClient;
    private final String baseUrl;

    public NlpClient(WebClient webClient,
                     @Value("${app.nlp.base-url}") String baseUrl) {
        this.webClient = webClient;
        this.baseUrl = baseUrl;
    }

    public List<SentimentItem> analyzeBatch(List<String> texts) {
        try {
            SentimentBatchResponse res = webClient.post()
                    .uri(baseUrl + "/nlp/sentiment:batch")
                    .bodyValue(new SentimentBatchRequest(texts))
                    .retrieve()
                    .bodyToMono(SentimentBatchResponse.class)
                    .block();

            if (res == null || res.results() == null || res.results().size() != texts.size()) {
                return fallback(texts.size());
            }
            return res.results();
        } catch (Exception e) {
            return fallback(texts.size());
        }
    }

    private List<SentimentItem> fallback(int n) {
        return java.util.stream.IntStream.range(0, n)
                .mapToObj(i -> new SentimentItem("NEUTRAL", 0.5))
                .toList();
    }

    public record SentimentBatchRequest(List<String> texts) {}
    public record SentimentItem(String label, double score) {}
    public record SentimentBatchResponse(List<SentimentItem> results) {}
}
