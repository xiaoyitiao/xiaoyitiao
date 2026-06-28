package com.zhiyaoban.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AiParseRequest {
    @NotBlank(message = "待解析内容不能为空")
    private String content;

    @NotBlank(message = "系统提示不能为空")
    private String systemPrompt;
}
