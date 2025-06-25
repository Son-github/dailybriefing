package com.sonny.authservice.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.SignatureAlgorithm;
import org.springframework.stereotype.Component;

import java.util.Date;

@Component
public class JwtTokenProvider {

 //   @Value("${jwt.secret}")
    private String secretKey = "ca38a08a0feda1b3962f9e1d6dea25ad16cc6b7097032c80d1497c4220c232a552d6c8ac94098627179e6047d81967557c42287f02bacc0216fb22498a2a4c30";

//   @Value("${jwt.expiration}")
    private long expirationTime = 900000;

    public String generateToken(String email) {
        Claims claims = Jwts.claims().setSubject(email);

        Date now =  new Date();
        Date expiry = new Date(now.getTime() + expirationTime);

        return Jwts.builder()
                .setClaims(claims)
                .setIssuedAt(now)
                .setExpiration(expiry)
                .signWith(SignatureAlgorithm.HS256, secretKey)
                .compact();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser().setSigningKey(secretKey).parseClaimsJws(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public String getEmailFromToken(String token) {
        return Jwts.parser().setSigningKey(secretKey)
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
    }

    public String getRoleFromToken(String token) {
        return (String) Jwts.parser().setSigningKey(secretKey)
                .parseClaimsJws(token)
                .getBody()
                .get("role");
    }
}
