package com.zhiyaoban.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.zhiyaoban.config.AiConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * AI 代理服务
 * 后端携带 API Key 调用大模型，前端不接触密钥
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiProxyService {

    private final AiConfig aiConfig;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public String chat(String userMessage, String systemPrompt) {
        if (Boolean.FALSE.equals(aiConfig.getEnabled()) ||
            aiConfig.getApiUrl() == null || aiConfig.getApiUrl().isBlank()) {
            throw new RuntimeException("AI 接口未配置，请在后端配置 AI_API_URL 和 AI_API_KEY");
        }

        String prompt = systemPrompt != null ? systemPrompt :
            "你是一位专业的用药咨询助手，请用简洁、温和的中文回答老年人或家属的用药问题，注意用药安全提醒。";

        Map<String, Object> body = new HashMap<>();
        body.put("model", aiConfig.getModel());
        body.put("messages", List.of(
            Map.of("role", "system", "content", prompt),
            Map.of("role", "user", "content", userMessage)
        ));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(aiConfig.getApiKey());

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                aiConfig.getApiUrl(), HttpMethod.POST, entity, String.class);
            if (!response.getStatusCode().is2xxSuccessful()) {
                log.error("AI 接口返回错误：{} {}", response.getStatusCode(), response.getBody());
                throw new RuntimeException("AI 接口调用失败：" + response.getStatusCode());
            }
            return extractContent(response.getBody());
        } catch (Exception e) {
            log.error("AI 代理调用失败", e);
            throw new RuntimeException("AI 调用失败：" + e.getMessage());
        }
    }

    private String extractContent(String responseBody) {
        try {
            Map<?, ?> map = objectMapper.readValue(responseBody, Map.class);
            Object choices = map.get("choices");
            if (choices instanceof List<?> list && !list.isEmpty()) {
                Object first = list.get(0);
                if (first instanceof Map<?, ?> choice) {
                    Object message = choice.get("message");
                    if (message instanceof Map<?, ?> msg) {
                        Object content = msg.get("content");
                        if (content != null) return content.toString();
                    }
                }
            }
            // 兼容国内部分模型返回 result
            Object result = map.get("result");
            if (result != null) return result.toString();
            return responseBody;
        } catch (Exception e) {
            log.warn("解析 AI 响应失败，返回原始内容", e);
            return responseBody;
        }
    }
}
