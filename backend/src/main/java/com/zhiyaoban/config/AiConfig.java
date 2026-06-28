package com.zhiyaoban.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "zhiyaoban.ai")
public class AiConfig {
    private Boolean enabled;
    private String apiUrl;
    private String apiKey;
    private String model;
}
