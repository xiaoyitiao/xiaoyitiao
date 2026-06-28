package com.zhiyaoban.security;

import com.zhiyaoban.config.JwtConfig;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * JWT 工具类
 * 负责生成、解析、验证 token
 */
@Component
@RequiredArgsConstructor
public class JwtUtil {

    private final JwtConfig jwtConfig;
    private SecretKey secretKey;

    private static final String DEFAULT_SECRET = "zhiyaoban-default-secret-must-be-replaced-in-production";

    @PostConstruct
    public void init() {
        String secret = jwtConfig.getSecret();
        if (DEFAULT_SECRET.equals(secret) || secret.length() < 32) {
            throw new IllegalStateException(
                "JWT 密钥未配置或长度不足（至少 32 个字符）。生产环境请通过环境变量 JWT_SECRET 注入强密钥。"
            );
        }
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * 生成 JWT
     */
    public String generateToken(String phone, Long userId, String role) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + jwtConfig.getExpirationMs());

        return Jwts.builder()
            .subject(phone)
            .claim("userId", userId)
            .claim("role", role)
            .issuedAt(now)
            .expiration(expiry)
            .signWith(secretKey, Jwts.SIG.HS256)
            .compact();
    }

    /**
     * 从 token 解析 Claims
     */
    public Claims parseToken(String token) {
        return Jwts.parser()
            .verifyWith(secretKey)
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }

    /**
     * 验证 token 是否有效
     */
    public boolean validateToken(String token) {
        try {
            parseToken(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public Long getUserId(String token) {
        return parseToken(token).get("userId", Long.class);
    }

    public String getPhone(String token) {
        return parseToken(token).getSubject();
    }
}
