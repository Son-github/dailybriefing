package com.sonny.newsservice.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NewsItem {
    private String title;
    private String link;
    private String sentiment;
}
