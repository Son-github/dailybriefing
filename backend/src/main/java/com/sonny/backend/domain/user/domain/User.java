package com.sonny.backend.domain.user.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.ZonedDateTime;


/* 사용자 */
@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long userId;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false, length = 50)
    private String location;

    @Column(nullable = false)
    private ZonedDateTime createdAt =  ZonedDateTime.now();

    private ZonedDateTime lastLoginAt;

}
