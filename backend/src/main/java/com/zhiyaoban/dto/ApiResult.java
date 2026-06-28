package com.zhiyaoban.dto;

import lombok.Data;

/**
 * 统一 API 响应
 */
@Data
public class ApiResult<T> {
    private int code;
    private String message;
    private T data;

    public static <T> ApiResult<T> ok(T data) {
        ApiResult<T> result = new ApiResult<>();
        result.setCode(200);
        result.setMessage("success");
        result.setData(data);
        return result;
    }

    public static <T> ApiResult<T> ok() {
        return ok(null);
    }

    public static <T> ApiResult<T> error(String message) {
        ApiResult<T> result = new ApiResult<>();
        result.setCode(500);
        result.setMessage(message);
        return result;
    }

    public static <T> ApiResult<T> error(int code, String message) {
        ApiResult<T> result = new ApiResult<>();
        result.setCode(code);
        result.setMessage(message);
        return result;
    }
}
