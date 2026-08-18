package com.sonny.newsservice.service;

import com.rometools.rome.feed.synd.SyndEntry;
import com.sonny.newsservice.domain.FetchRun;
import com.sonny.newsservice.domain.KeywordStat;
import com.sonny.newsservice.dto.NewsBriefResponse;
import com.sonny.newsservice.dto.NewsTopItemDto;
import com.sonny.newsservice.dto.TrendBadgeDto;
import com.sonny.newsservice.repository.FetchRunRepository;
import com.sonny.newsservice.repository.KeywordStatRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class NewsFacadeService {

    private final GoogleNewsRssClient rssClient;
    private final KeywordExtractor keywordExtractor;
    private final TrendScoringService trendScoringService;
    private final FetchRunRepository fetchRunRepository;
    private final KeywordStatRepository keywordStatRepository;

    @Value("${app.news.rss-url}")
    private String rssUrl;

    @Value("${app.news.top-n:10}")
    private int topN;

    @Value("${app.news.trend.source-top-n:50}")
    private int trendSourceTopN;

    @Value("${app.news.trend.max-keywords:5}")
    private int trendLimit;

    public NewsBriefResponse fetchBrief() {
        OffsetDateTime fetchedAt = OffsetDateTime.now();
        List<SyndEntry> entries = rssClient.fetch(rssUrl);
        List<SyndEntry> topNews = entries.stream().limit(topN).toList();
        List<SyndEntry> trendSource = entries.stream().limit(trendSourceTopN).toList();

        List<NewsTopItemDto> newsTop10 = new ArrayList<>();
        for (int i = 0; i < topNews.size(); i++) {
            SyndEntry entry = topNews.get(i);
            newsTop10.add(NewsTopItemDto.builder()
                    .rank(i + 1)
                    .title(keywordExtractor.normalizeTitle(entry.getTitle()))
                    .link(entry.getLink())
                    .publishedAt(entry.getPublishedDate() != null ? entry.getPublishedDate().toString() : null)
                    .build());
        }

        Map<String, Integer> currentKeywordCounts = new HashMap<>();
        for (SyndEntry entry : trendSource) {
            String title = keywordExtractor.normalizeTitle(entry.getTitle());
            for (String keyword : keywordExtractor.extractFromTitle(title)) {
                currentKeywordCounts.merge(keyword, 1, Integer::sum);
            }
        }

        FetchRun run = fetchRunRepository.save(FetchRun.builder()
                .fetchedAt(fetchedAt)
                .sourceUrl(rssUrl)
                .itemCount(trendSource.size())
                .build());

        List<KeywordStat> stats = currentKeywordCounts.entrySet().stream()
                .map(entry -> KeywordStat.builder()
                        .fetchRun(run)
                        .keyword(entry.getKey())
                        .count(entry.getValue())
                        .build())
                .toList();
        keywordStatRepository.saveAll(stats);

        Map<String, Integer> previousKeywordCounts = new HashMap<>();
        fetchRunRepository.findTopByIdLessThanOrderByFetchedAtDesc(run.getId())
                .ifPresent(previousRun -> keywordStatRepository.findByFetchRun(previousRun)
                        .forEach(stat -> previousKeywordCounts.put(stat.getKeyword(), stat.getCount())));

        List<TrendBadgeDto> trendTop5 = trendScoringService.makeTrendTop(
                currentKeywordCounts,
                previousKeywordCounts,
                trendLimit
        );

        return NewsBriefResponse.builder()
                .fetchedAt(fetchedAt)
                .sourceUrl(rssUrl)
                .newsTop10(newsTop10)
                .trendTop5(trendTop5)
                .stale(false)
                .build();
    }
}
