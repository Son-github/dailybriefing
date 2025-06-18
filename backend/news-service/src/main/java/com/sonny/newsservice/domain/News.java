package com.sonny.newsservice.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class News {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "prompt", length = 500)
    private String prompt;

    @Column(name = "response", length = 5000)
    private String response;

    @Column(name = "createdAt")
    private LocalDateTime createdAt;
}
