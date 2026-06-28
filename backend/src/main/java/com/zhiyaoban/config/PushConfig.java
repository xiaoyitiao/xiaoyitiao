package com.zhiyaoban.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * 推送配置
 * 支持极光推送 (JPush) 和 Web Push
 */
@Data
@Component
@ConfigurationProperties(prefix = "zhiyaoban.push")
public class PushConfig {

    /**
     * 是否启用推送
     */
    private boolean enabled = true;

    /**
     * 推送平台类型：jpush / webpush / mock
     */
    private String platform = "mock";

    // ==================== 极光推送配置 ====================

    /**
     * 极光推送 AppKey
     */
    private String jpushAppKey;

    /**
     * 极光推送 Master Secret
     */
    private String jpushMasterSecret;

    /**
     * 极光推送是否生产环境
     */
    private boolean jpushProduction = false;

    /**
     * 极光推送推送标题前缀
     */
    private String jpushTitlePrefix = "智药伴";

    // ==================== Web Push 配置 ====================

    /**
     * VAPID 主题（mailto链接）
     */
    private String vapidSubject;

    /**
     * VAPID 公钥
     */
    private String vapidPublicKey;

    /**
     * VAPID 私钥
     */
    private String vapidPrivateKey;

    /**
     * 获取公钥（Base64编码）
     */
    public String getPublicKeyBase64() {
        return vapidPublicKey;
    }

    /**
     * 获取私钥（Base64编码）
     */
    public String getPrivateKeyBase64() {
        return vapidPrivateKey;
    }

    /**
     * 检查是否已配置极光推送
     */
    public boolean isJpushConfigured() {
        return jpushAppKey != null && !jpushAppKey.isEmpty()
            && jpushMasterSecret != null && !jpushMasterSecret.isEmpty();
    }

    /**
     * 检查是否已配置 Web Push
     */
    public boolean isWebPushConfigured() {
        return vapidPublicKey != null && !vapidPublicKey.isEmpty()
            && vapidPrivateKey != null && !vapidPrivateKey.isEmpty();
    }
}