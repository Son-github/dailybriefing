package com.sonny.authservice.config;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;

@Component
public class JwtTokenProvider {

    private final Key key;
    private final long accessTokenValidityMs;
    private final long refreshTokenValidityMs;

    public JwtTokenProvider(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.access-validity-ms:3600000}") long accessTokenValidityMs,      // 1h
            @Value("${jwt.refresh-validity-ms:604800000}") long refreshTokenValidityMs  // 7d
    ) {
        // ✅ HMAC-SHA 키는 충분히 길어야 함(최소 32 bytes 권장)
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenValidityMs = accessTokenValidityMs;
        this.refreshTokenValidityMs = refreshTokenValidityMs;
    }

    public String generateAccessToken(String email) {
        return generateToken(email, accessTokenValidityMs, "ACCESS");
    }

    public String generateRefreshToken(String email) {
        return generateToken(email, refreshTokenValidityMs, "REFRESH");
    }

    private String generateToken(String email, long validityMs, String type) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + validityMs);

        return Jwts.builder()
                .setSubject(email)              // ✅ Authentication.getName() 으로 쓰기 좋게 email
                .claim("typ", type)             // ACCESS/REFRESH 구분(선택)
                .setIssuedAt(now)
                .setExpiration(expiry)
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public String getEmailFromToken(String token) {
        return parseClaims(token).getSubject();
    }

    public boolean isRefreshToken(String token) {
        try {
            Claims claims = parseClaims(token);
            Object typ = claims.get("typ");
            return typ != null && "REFRESH".equals(typ.toString());
        } catch (Exception e) {
            return false;
        }
    }

    private Claims parseClaims(String token) {
        // jjwt 0.11.x 스타일
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}
