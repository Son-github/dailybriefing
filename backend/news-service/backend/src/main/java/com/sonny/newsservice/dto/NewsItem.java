package com.sonny.newsservice.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NewsItem {
    private String title;
    private String link;

    @JsonIgnore // 응답 JSON에서 제외
    private String content;

    private String sentiment;
}
