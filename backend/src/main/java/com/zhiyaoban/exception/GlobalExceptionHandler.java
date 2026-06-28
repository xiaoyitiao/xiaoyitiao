package com.zhiyaoban.exception;

import com.zhiyaoban.dto.ApiResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

/**
 * 全局异常处理器
 * 统一处理所有Controller抛出的异常
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * 处理自定义业务异常
     */
    @ExceptionHandler(BusinessException.class)
    public ApiResult<Void> handleBusinessException(BusinessException e) {
        log.error("业务异常 [{}]: {}", e.getErrorCode(), e.getMessage());
        return ApiResult.error(400, e.getMessage());
    }
    
    /**
     * 处理资源未找到异常
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ApiResult<Void> handleResourceNotFoundException(ResourceNotFoundException e) {
        log.warn("资源未找到: {} (ID: {})", e.getResourceType(), e.getResourceId());
        return ApiResult.error(404, e.getMessage());
    }
    
    /**
     * 处理认证失败异常
     */
    @ExceptionHandler(AuthenticationFailedException.class)
    public ApiResult<Void> handleAuthenticationFailedException(AuthenticationFailedException e) {
        log.warn("认证失败: {}", e.getMessage());
        return ApiResult.error(401, e.getMessage());
    }
    
    /**
     * 处理短信发送失败异常
     */
    @ExceptionHandler(SmsSendFailedException.class)
    public ApiResult<Void> handleSmsSendFailedException(SmsSendFailedException e) {
        log.error("短信发送失败: {}", e.getMessage());
        return ApiResult.error(500, "短信发送失败，请稍后重试");
    }
    
    /**
     * 处理访问权限异常（自定义）
     */
    @ExceptionHandler(com.zhiyaoban.exception.AccessDeniedException.class)
    public ApiResult<Void> handleAccessDeniedException(com.zhiyaoban.exception.AccessDeniedException e) {
        log.warn("权限不足: {} (ID: {})", e.getResourceType(), e.getResourceId());
        return ApiResult.error(403, e.getMessage());
    }

    /**
     * 处理其他运行时异常（未使用自定义异常的情况）
     */
    @ExceptionHandler(RuntimeException.class)
    public ApiResult<Void> handleRuntimeException(RuntimeException e) {
        log.error("未预期的运行时异常: {}", e.getMessage(), e);
        return ApiResult.error(500, "系统异常，请稍后重试");
    }

    /**
     * 处理参数验证异常
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ApiResult<Map<String, String>> handleValidationException(MethodArgumentNotValidException e) {
        Map<String, String> errors = new HashMap<>();
        e.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });
        log.warn("参数验证失败: {}", errors);
        return ApiResult.error(400, "参数验证失败: " + errors);
    }

    /**
     * 处理认证异常
     */
    @ExceptionHandler(AuthenticationException.class)
    public ApiResult<Void> handleAuthenticationException(AuthenticationException e) {
        log.warn("认证失败: {}", e.getMessage());
        return ApiResult.error(401, "认证失败: " + e.getMessage());
    }

    /**
     * 处理权限异常
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ApiResult<Void> handleAccessDeniedException(AccessDeniedException e) {
        log.warn("权限不足: {}", e.getMessage());
        return ApiResult.error(403, "权限不足");
    }

    /**
     * 处理IllegalArgumentException
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ApiResult<Void> handleIllegalArgumentException(IllegalArgumentException e) {
        log.warn("参数错误: {}", e.getMessage());
        return ApiResult.error(400, "参数错误: " + e.getMessage());
    }

    /**
     * 处理所有未捕获的异常
     */
    @ExceptionHandler(Exception.class)
    public ApiResult<Void> handleException(Exception e) {
        log.error("系统异常: {}", e.getMessage(), e);
        return ApiResult.error(500, "系统异常，请稍后重试");
    }
}
