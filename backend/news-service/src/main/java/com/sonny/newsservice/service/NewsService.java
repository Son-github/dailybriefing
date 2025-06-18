package com.sonny.newsservice.service;

import com.sonny.newsservice.domain.News;
import com.sonny.newsservice.dto.ChatGptRequest;
import com.sonny.newsservice.dto.ChatGptResponse;
import com.sonny.newsservice.repository.NewsRepository;
import lombok.RequiredArgsConstructor;
import lombok.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDateTime;
import java.util.Collections;

@Service
@RequiredArgsConstructor
public class NewsService {

    private final WebClient webClient;
    private final NewsRepository newsRepository;

    @Value("${openai.api.key}")
    private String openaiApiKey;

    private static final String PROMPT = "한국에서 지금 가장 화제가 되는 뉴스 10개를 한 줄 요약으로 알려줘. " +
            "각 뉴스는 번호를 붙이고, 한글로 보여줘." + "그리고 각 기사의 URL도 뉴스 한 줄 요약 뒤에 / 로 끊어서 알려줘";

    public String getTodayNewsSummary() {
        ChatGptRequest request = new ChatGptRequest("gpt-3.5-turbo",
                Collections.singletonList(new ChatGptRequest.Message("user", PROMPT)));

        ChatGptResponse chatGptResponse = webClient.post()
                .uri("https://api.openai.com/v1/chat/completions")
                .header("Authorization", "Bearer " + openaiApiKey)
                .bodyValue(request)
                .retrieve()
                .bodyToMono(ChatGptResponse.class)
                .block();

        String summary = chatGptResponse.getChoices()[0].getMessage().getContent();

        newsRepository.save(News.builder()
                .prompt(PROMPT)
                .response(summary)
                .createdAt(LocalDateTime.now())
                .build());

        return summary;
    }

    public String getLatestSummaryFromDB() {
        return newsRepository.findTop1ByOrderByCreatedAtDesc()
                .map(News::getResponse)
                .orElse("요약된 뉴스가 없습니다.");
    }
}
