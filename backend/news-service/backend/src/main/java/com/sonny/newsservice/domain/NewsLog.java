package com.sonny.newsservice.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NewsLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String query;
    @Column(columnDefinition = "TEXT")
    private String result;
    private String sentiment;
    private LocalDateTime createdAt;
}
