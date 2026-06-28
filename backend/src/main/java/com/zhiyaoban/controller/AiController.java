package com.zhiyaoban.controller;

import com.zhiyaoban.config.AiConfig;
import com.zhiyaoban.dto.AiChatRequest;
import com.zhiyaoban.dto.AiParseRequest;
import com.zhiyaoban.dto.ApiResult;
import com.zhiyaoban.service.AiProxyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * AI 代理接口
 * 前端只调此接口，后端再带密钥调大模型，避免 API Key 泄露
 */
@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiProxyService aiProxyService;
    private final AiConfig aiConfig;

    /**
     * AI 对话接口
     */
    @PostMapping("/chat")
    public ApiResult<Map<String, String>> chat(@RequestBody @Valid AiChatRequest request) {
        if (!Boolean.TRUE.equals(aiConfig.getEnabled())) {
            return ApiResult.error(503, "AI功能已禁用");
        }
        String reply = aiProxyService.chat(request.getMessage(), request.getSystemPrompt());
        return ApiResult.ok(Map.of("reply", reply));
    }

    /**
     * AI 解析接口（用于OCR结果解析等）
     */
    @PostMapping("/parse")
    public ApiResult<Map<String, String>> parse(@RequestBody @Valid AiParseRequest request) {
        if (!Boolean.TRUE.equals(aiConfig.getEnabled())) {
            return ApiResult.error(503, "AI功能已禁用");
        }
        String reply = aiProxyService.chat(request.getContent(), request.getSystemPrompt());
        return ApiResult.ok(Map.of("reply", reply));
    }

    /**
     * 获取AI功能状态
     */
    @GetMapping("/status")
    public ApiResult<Map<String, Object>> getStatus() {
        return ApiResult.ok(Map.of(
            "enabled", Boolean.TRUE.equals(aiConfig.getEnabled()),
            "model", aiConfig.getModel() != null ? aiConfig.getModel() : "未配置"
        ));
    }
}
