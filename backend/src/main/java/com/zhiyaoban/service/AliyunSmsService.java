package com.zhiyaoban.service;

import com.aliyun.dysmsapi20170525.Client;
import com.aliyun.dysmsapi20170525.models.SendSmsRequest;
import com.aliyun.dysmsapi20170525.models.SendSmsResponse;
import com.aliyun.teaopenapi.models.Config;
import com.zhiyaoban.config.SmsConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * 阿里云短信服务
 * 用于发送验证码和提醒短信
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AliyunSmsService {

    private final SmsConfig smsConfig;

    private volatile Client client;
    
    /**
     * 初始化锁对象，用于线程安全的客户端初始化
     */
    private final Object clientInitLock = new Object();

    /**
     * 初始化阿里云短信客户端
     * 使用双重检查锁定模式确保线程安全
     */
    private void initClient() throws Exception {
        if (client != null) {
            return;
        }
        
        synchronized (clientInitLock) {
            // 双重检查，防止多线程重复初始化
            if (client != null) {
                return;
            }

            Config config = new Config()
                .setAccessKeyId(smsConfig.getAccessKeyId())
                .setAccessKeySecret(smsConfig.getAccessKeySecret())
                .setRegionId(smsConfig.getRegionId())
                .setEndpoint("dysmsapi.aliyuncs.com");

            client = new Client(config);
        }
    }

    /**
     * 发送验证码短信
     * @param phone 手机号
     * @param code 验证码
     * @return 是否发送成功
     */
    public boolean sendVerificationCode(String phone, String code) {
        return sendSms(phone, smsConfig.getTemplateCode(), Map.of("code", code));
    }

    /**
     * 发送提醒短信
     * @param phone 手机号
     * @param templateCode 模板CODE
     * @param params 模板参数
     * @return 是否发送成功
     */
    public boolean sendReminderSms(String phone, String templateCode, Map<String, String> params) {
        return sendSms(phone, templateCode, params);
    }

    /**
     * 发送短信通用方法
     * @param phone 手机号
     * @param templateCode 模板CODE
     * @param templateParams 模板参数
     * @return 是否发送成功
     */
    public boolean sendSms(String phone, String templateCode, Map<String, String> templateParams) {
        if (!smsConfig.isAliyunConfigured()) {
            log.warn("阿里云短信未配置完整，跳过发送");
            return false;
        }

        try {
            initClient();

            // 构建模板参数JSON
            String templateParam = buildTemplateParam(templateParams);

            SendSmsRequest request = new SendSmsRequest()
                .setPhoneNumbers(phone)
                .setSignName(smsConfig.getSignName())
                .setTemplateCode(templateCode)
                .setTemplateParam(templateParam);

            SendSmsResponse response = client.sendSms(request);

            if ("OK".equals(response.getBody().getCode())) {
                log.info("短信发送成功，手机号: {}, BizId: {}", phone, response.getBody().getBizId());
                return true;
            } else {
                log.error("短信发送失败，手机号: {}, 错误码: {}, 错误信息: {}",
                    phone, response.getBody().getCode(), response.getBody().getMessage());
                return false;
            }

        } catch (Exception e) {
            log.error("短信发送异常，手机号: {}, 异常: {}", phone, e.getMessage(), e);
            return false;
        }
    }

    /**
     * 构建模板参数JSON
     */
    private String buildTemplateParam(Map<String, String> params) {
        if (params == null || params.isEmpty()) {
            return "{}";
        }

        StringBuilder sb = new StringBuilder("{");
        int i = 0;
        for (Map.Entry<String, String> entry : params.entrySet()) {
            if (i > 0) {
                sb.append(",");
            }
            sb.append("\"").append(entry.getKey()).append("\":\"").append(entry.getValue()).append("\"");
            i++;
        }
        sb.append("}");
        return sb.toString();
    }
}