package com.sonny.newsservice.dto;

import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class NewsTopItemDto {
    private int rank;
    private String title;
    private String link;
    private String publishedAt;
}
