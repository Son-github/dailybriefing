package com.sonny.backend.domain.user.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "stock_indices", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"index_code", "fetched_at"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockIndex {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long indexId;

    @Column(name = "index_code", length = 20, nullable = false)
    private String indexCode;

    @Column(name = "index_name", length = 100, nullable = false)
    private String indexName;

    @Column(nullable = false)
}
