package com.zhiyaoban.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "zhiyaoban.report")
public class ReportConfig {
    private String pythonPath;
    private String scriptPath;
    private String outputDir;
}
