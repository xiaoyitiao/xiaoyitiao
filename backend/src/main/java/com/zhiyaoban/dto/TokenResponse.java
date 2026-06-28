package com.zhiyaoban.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TokenResponse {
    private String token;
    private String phone;
    private String role;
    private Long userId;
    private Long expiresIn;
}
