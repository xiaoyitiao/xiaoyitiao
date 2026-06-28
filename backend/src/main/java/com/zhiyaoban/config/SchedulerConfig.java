package com.zhiyaoban.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * 调度器配置
 */
@Data
@Component
@ConfigurationProperties(prefix = "zhiyaoban.scheduler")
public class SchedulerConfig {

    /**
     * 是否启用调度器
     */
    private boolean enabled = true;

    /**
     * 漏服提醒延迟分钟数
     */
    private int missedDelayMinutes = 30;

    /**
     * 库存提醒阈值
     */
    private int stockThreshold = 5;
}
