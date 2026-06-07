package com.sonny.newsservice.service;

import com.rometools.rome.feed.synd.SyndEntry;
import com.sonny.newsservice.domain.FetchRun;
import com.sonny.newsservice.domain.KeywordStat;
import com.sonny.newsservice.dto.*;
import com.sonny.newsservice.repository.FetchRunRepository;
import com.sonny.newsservice.repository.KeywordStatRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.time.Duration;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
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

    // ✅ 트렌드는 Top50 제목으로
    @Value("${app.news.trend.source-top-n:50}")
    private int trendSourceTopN;

    // ✅ 화면에 보여줄 트렌드 키워드 수(보통 5)
    @Value("${app.news.trend.max-keywords:5}")
    private int trendLimit;

    @Value("${app.data-refresh-ms:600000}")
    private long refreshMs;

    private volatile NewsBriefResponse cached;
    private volatile OffsetDateTime cachedAt;

    public NewsBriefResponse fetchBrief() {
        if (cached == null || cachedAt == null || Duration.between(cachedAt, OffsetDateTime.now()).toMillis() >= refreshMs) {
            refresh();
        }
        return cached;
    }

    @Scheduled(fixedDelayString = "${app.data-refresh-ms:600000}", initialDelayString = "${app.data-refresh-ms:600000}")
    public synchronized void refresh() {
        OffsetDateTime fetchedAt = OffsetDateTime.now();

        List<SyndEntry> entries;
        try {
            entries = rssClient.fetch(rssUrl);
        } catch (Exception e) {
            if (cached != null) {
                log.warn("News RSS refresh failed; returning cached news: {}", e.getMessage());
                cached.setStale(true);
                return;
            }
            throw e;
        }

        List<SyndEntry> top10 = entries.stream().limit(topN).toList();
        List<SyndEntry> topForTrend = entries.stream().limit(trendSourceTopN).toList();

        // 이전에는 Top10을 NLP 서비스에 보냈다. 지금은 원문 링크와 제목만 제공한다.
        List<NewsTopItemDto> newsTop10 = new ArrayList<>();

        for (int i = 0; i < top10.size(); i++) {
            SyndEntry e = top10.get(i);
            String rawTitle = e.getTitle();
            String normalizedTitle = keywordExtractor.normalizeTitle(rawTitle); // ✅ 표시도 깔끔해짐(언론사 꼬리 제거)

            newsTop10.add(NewsTopItemDto.builder()
                    .rank(i + 1)
                    .title(normalizedTitle)
                    .link(e.getLink())
                    .publishedAt(e.getPublishedDate() != null ? e.getPublishedDate().toString() : null)
                    .build());

        }

        // 4) TrendTop50: 제목만으로 키워드 카운트 (비용/시간 절감)
        Map<String, Integer> currentKeywordCounts = new HashMap<>();
        for (SyndEntry e : topForTrend) {
            String normalizedTitle = keywordExtractor.normalizeTitle(e.getTitle());
            for (String kw : keywordExtractor.extractFromTitle(normalizedTitle)) {
                currentKeywordCounts.merge(kw, 1, Integer::sum);
            }
        }

        // 5) DB 저장: FetchRun + KeywordStat(트렌드 비교용)
        // ✅ itemCount는 "트렌드에 사용한 뉴스 수"로 기록하면 나중에 운영 분석에도 좋음
        FetchRun run = fetchRunRepository.save(FetchRun.builder()
                .fetchedAt(fetchedAt)
                .sourceUrl(rssUrl)
                .itemCount(topForTrend.size())
                .build());

        List<KeywordStat> stats = currentKeywordCounts.entrySet().stream()
                .map(e -> KeywordStat.builder()
                        .fetchRun(run)
                        .keyword(e.getKey())
                        .count(e.getValue())
                        .build())
                .toList();
        keywordStatRepository.saveAll(stats);

        // 6) 이전 run 스냅샷 로딩
        Map<String, Integer> prevKeywordCounts = new HashMap<>();
        fetchRunRepository.findTopByIdLessThanOrderByFetchedAtDesc(run.getId())
                .ifPresent(prevRun -> keywordStatRepository.findByFetchRun(prevRun)
                        .forEach(ks -> prevKeywordCounts.put(ks.getKeyword(), ks.getCount()))
                );

        // 7) TrendTop5 생성
        List<TrendBadgeDto> trendTop5 =
                trendScoringService.makeTrendTop(currentKeywordCounts, prevKeywordCounts, trendLimit);

        cached = NewsBriefResponse.builder()
                .fetchedAt(fetchedAt)
                .sourceUrl(rssUrl)
                .newsTop10(newsTop10)
                .trendTop5(trendTop5)
                .stale(false)
                .build();
        cachedAt = fetchedAt;
    }
}
