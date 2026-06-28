package com.zhiyaoban.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * 短信配置
 * 支持阿里云短信服务
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "zhiyaoban.sms")
public class SmsConfig {

    /**
     * 是否使用模拟模式（演示环境）
     */
    private Boolean mock = true;

    /**
     * 模拟模式下固定验证码
     */
    private String fixedCode = "123456";

    /**
     * 阿里云短信 AccessKey ID
     */
    private String accessKeyId;

    /**
     * 阿里云短信 AccessKey Secret
     */
    private String accessKeySecret;

    /**
     * 阿里云短信签名名称
     */
    private String signName;

    /**
     * 阿里云短信模板CODE（验证码模板）
     */
    private String templateCode;

    /**
     * 阿里云短信服务区域ID
     */
    private String regionId = "cn-hangzhou";

    /**
     * 验证码有效期（分钟）
     */
    private Integer expireMinutes = 5;

    /**
     * 检查是否已配置阿里云短信
     */
    public boolean isAliyunConfigured() {
        return accessKeyId != null && !accessKeyId.isEmpty()
            && accessKeySecret != null && !accessKeySecret.isEmpty()
            && signName != null && !signName.isEmpty()
            && templateCode != null && !templateCode.isEmpty();
    }
}