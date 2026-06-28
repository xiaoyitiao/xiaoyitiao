package com.zhiyaoban.exception;

/**
 * 认证失败异常
 * 用于验证码验证失败、登录失败等情况
 */
public class AuthenticationFailedException extends BusinessException {
    
    public AuthenticationFailedException(String message) {
        super("AUTH_FAILED", message);
    }
    
    public AuthenticationFailedException(String message, Throwable cause) {
        super("AUTH_FAILED", message, cause);
    }
}