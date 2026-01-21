package com.sonny.newsservice.dto;

import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class TrendBadgeDto {
    private int rank;
    private String keyword;

    private int score;        // 0~100
    private int sizeLevel;    // 1~5 (아이콘 크기/폰트 크기)
    private String direction; // UP | DOWN | FLAT

    private int currentCount;
    private int previousCount;
    private int delta;
}
