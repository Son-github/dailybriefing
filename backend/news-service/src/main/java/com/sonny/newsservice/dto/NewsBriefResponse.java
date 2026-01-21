package com.sonny.newsservice.dto;

import lombok.*;

import java.time.OffsetDateTime;
import java.util.List;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class NewsBriefResponse {
    private OffsetDateTime fetchedAt;
    private String sourceUrl;

    private List<NewsTopItemDto> newsTop10;
    private List<TrendBadgeDto> trendTop5;

    private SentimentSummaryDto sentimentSummary;
}
