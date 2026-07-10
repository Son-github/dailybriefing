package com.sonny.newsservice.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rometools.rome.feed.synd.SyndEntry;
import com.sonny.newsservice.domain.FetchRun;
import com.sonny.newsservice.domain.KeywordStat;
import com.sonny.newsservice.dto.*;
import com.sonny.newsservice.repository.FetchRunRepository;
import com.sonny.newsservice.repository.KeywordStatRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class NewsFacadeService {

    private static final String CACHE_KEY = "dailybriefing:news:brief";
    private static final String LOCK_KEY = "dailybriefing:lock:news:brief";
    private static final Duration LOCK_TTL = Duration.ofSeconds(30);

    private final GoogleNewsRssClient rssClient;
    private final KeywordExtractor keywordExtractor;
    private final TrendScoringService trendScoringService;

    private final FetchRunRepository fetchRunRepository;
    private final KeywordStatRepository keywordStatRepository;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

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

    public NewsBriefResponse fetchBrief() {
        NewsBriefResponse cached = readCached();
        if (cached != null) return cached;

        return refresh();
    }

    @Scheduled(fixedDelayString = "${app.data-refresh-ms:600000}", initialDelayString = "${app.data-refresh-ms:600000}")
    public void refreshScheduled() {
        refresh();
    }

    public synchronized NewsBriefResponse refresh() {
        String lockToken = acquireLock();
        if (lockToken == null) {
            NewsBriefResponse cached = waitForCached();
            if (cached != null) return cached;
        }

        try {
            OffsetDateTime fetchedAt = OffsetDateTime.now();

            List<SyndEntry> entries;
            try {
                entries = rssClient.fetch(rssUrl);
            } catch (Exception e) {
                NewsBriefResponse cached = readCached();
                if (cached != null) {
                    log.warn("News RSS refresh failed; returning cached news: {}", e.getMessage());
                    cached.setStale(true);
                    writeCached(cached);
                    return cached;
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

            NewsBriefResponse response = NewsBriefResponse.builder()
                    .fetchedAt(fetchedAt)
                    .sourceUrl(rssUrl)
                    .newsTop10(newsTop10)
                    .trendTop5(trendTop5)
                    .stale(false)
                    .build();
            writeCached(response);
            return response;
        } finally {
            releaseLock(lockToken);
        }
    }

    private NewsBriefResponse readCached() {
        try {
            String value = redisTemplate.opsForValue().get(CACHE_KEY);
            if (value == null || value.isBlank()) return null;
            return objectMapper.readValue(value, NewsBriefResponse.class);
        } catch (DataAccessException | JsonProcessingException e) {
            log.warn("News Redis cache read failed: {}", e.getMessage());
            return null;
        }
    }

    private void writeCached(NewsBriefResponse response) {
        try {
            redisTemplate.opsForValue().set(CACHE_KEY, objectMapper.writeValueAsString(response), Duration.ofMillis(refreshMs));
        } catch (DataAccessException | JsonProcessingException e) {
            log.warn("News Redis cache write failed: {}", e.getMessage());
        }
    }

    private String acquireLock() {
        try {
            String token = UUID.randomUUID().toString();
            Boolean locked = redisTemplate.opsForValue().setIfAbsent(LOCK_KEY, token, LOCK_TTL);
            return Boolean.TRUE.equals(locked) ? token : null;
        } catch (DataAccessException e) {
            log.warn("News Redis lock failed: {}", e.getMessage());
            return UUID.randomUUID().toString();
        }
    }

    private void releaseLock(String lockToken) {
        if (lockToken == null) return;
        try {
            if (lockToken.equals(redisTemplate.opsForValue().get(LOCK_KEY))) {
                redisTemplate.delete(LOCK_KEY);
            }
        } catch (DataAccessException e) {
            log.warn("News Redis lock release failed: {}", e.getMessage());
        }
    }

    private NewsBriefResponse waitForCached() {
        for (int i = 0; i < 5; i++) {
            try {
                Thread.sleep(200);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return null;
            }

            NewsBriefResponse cached = readCached();
            if (cached != null) return cached;
        }
        return null;
    }
}
