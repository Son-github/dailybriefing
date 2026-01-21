package com.sonny.newsservice.dto;

import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class SentimentSummaryDto {
    private int positiveCount;
    private int negativeCount;
    private int neutralCount;
    private int total;
    private double averageScore;
}
