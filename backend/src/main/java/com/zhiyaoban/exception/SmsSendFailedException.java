package com.zhiyaoban.exception;

/**
 * 短信发送失败异常
 * 用于短信发送相关错误
 */
public class SmsSendFailedException extends BusinessException {
    
    public SmsSendFailedException(String message) {
        super("SMS_SEND_FAILED", message);
    }
    
    public SmsSendFailedException(String message, Throwable cause) {
        super("SMS_SEND_FAILED", message, cause);
    }
}