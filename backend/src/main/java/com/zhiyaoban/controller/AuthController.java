package com.zhiyaoban.controller;

import com.zhiyaoban.dto.ApiResult;
import com.zhiyaoban.dto.LoginRequest;
import com.zhiyaoban.dto.SmsRequest;
import com.zhiyaoban.dto.TokenResponse;
import com.zhiyaoban.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 认证接口
 */
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/send-code")
    public ApiResult<Void> sendCode(@RequestBody @Valid SmsRequest request) {
        authService.sendSmsCode(request);
        return ApiResult.ok();
    }

    @PostMapping("/login")
    public ApiResult<TokenResponse> login(@RequestBody @Valid LoginRequest request) {
        TokenResponse token = authService.login(request);
        return ApiResult.ok(token);
    }
}
