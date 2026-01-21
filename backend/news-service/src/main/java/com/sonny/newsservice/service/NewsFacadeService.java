package com.sonny.newsservice.service;

import com.rometools.rome.feed.synd.SyndEntry;
import com.sonny.newsservice.domain.FetchRun;
import com.sonny.newsservice.domain.KeywordStat;
import com.sonny.newsservice.dto.*;
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
    private final NlpClient nlpClient;

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

    public NewsBriefResponse fetchBrief() {
        OffsetDateTime fetchedAt = OffsetDateTime.now();

        // 1) RSS 한 번만 가져오고 (top10/ top50 둘 다 여기서 뽑는다)
        List<SyndEntry> entries = rssClient.fetch(rssUrl);

        List<SyndEntry> top10 = entries.stream().limit(topN).toList();
        List<SyndEntry> topForTrend = entries.stream().limit(trendSourceTopN).toList();

        // 2) Top10: 화면 표시용 + 감성분석 입력
        List<NewsTopItemDto> newsTop10 = new ArrayList<>();
        List<String> titlesForNlp = new ArrayList<>();

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

            titlesForNlp.add(normalizedTitle);
        }

        // 3) NLP 감성 batch → Top10에만 적용 (비용 절감)
        List<NlpClient.SentimentItem> sentiments = nlpClient.analyzeBatch(titlesForNlp);

        int pos = 0, neg = 0, neu = 0;
        double sum = 0.0;

        for (int i = 0; i < newsTop10.size(); i++) {
            NlpClient.SentimentItem s = sentiments.get(i);
            NewsTopItemDto item = newsTop10.get(i);

            item.setSentimentLabel(s.label());
            item.setSentimentScore(s.score());

            sum += s.score();
            if ("POSITIVE".equals(s.label())) pos++;
            else if ("NEGATIVE".equals(s.label())) neg++;
            else neu++;
        }

        SentimentSummaryDto sentimentSummary = SentimentSummaryDto.builder()
                .positiveCount(pos)
                .negativeCount(neg)
                .neutralCount(neu)
                .total(newsTop10.size())
                .averageScore(newsTop10.isEmpty() ? 0.0 : (sum / newsTop10.size()))
                .build();

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

        return NewsBriefResponse.builder()
                .fetchedAt(fetchedAt)
                .sourceUrl(rssUrl)
                .newsTop10(newsTop10)
                .trendTop5(trendTop5)
                .sentimentSummary(sentimentSummary)
                .build();
    }
}
