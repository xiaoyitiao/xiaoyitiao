package com.zhiyaoban.service;

import com.zhiyaoban.dto.PushSubscriptionDto;
import com.zhiyaoban.entity.PushSubscription;
import com.zhiyaoban.repository.PushSubscriptionRepository;
import com.zhiyaoban.config.PushConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 推送服务
 * 支持极光推送 (JPush) 和 Web Push
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PushService {

    private final PushSubscriptionRepository pushSubscriptionRepository;
    private final PushConfig pushConfig;
    private final JPushService jPushService;

    @Transactional
    public void saveSubscription(Long userId, PushSubscriptionDto dto) {
        PushSubscription subscription = new PushSubscription();
        subscription.setUserId(userId);
        subscription.setEndpoint(dto.getEndpoint());
        subscription.setP256dh(dto.getP256dh());
        subscription.setAuth(dto.getAuth());
        pushSubscriptionRepository.save(subscription);
        log.info("用户 {} 保存了新的推送订阅", userId);
    }

    public List<PushSubscription> listByUser(Long userId) {
        return pushSubscriptionRepository.findByUserId(userId);
    }

    /**
     * 发送推送通知
     * 根据配置选择推送平台：极光推送 / Web Push / 模拟模式
     */
    public boolean sendPush(Long userId, String title, String body) {
        if (!pushConfig.isEnabled()) {
            log.debug("推送功能已禁用，跳过发送");
            return false;
        }

        String platform = pushConfig.getPlatform();

        switch (platform.toLowerCase()) {
            case "jpush":
                return sendViaJPush(userId, title, body);
            case "webpush":
                return sendViaWebPush(userId, title, body);
            case "mock":
            default:
                return sendViaMock(userId, title, body);
        }
    }

    /**
     * 批量发送推送通知给多个用户
     */
    public boolean sendPushToUsers(List<Long> userIds, String title, String body) {
        if (!pushConfig.isEnabled()) {
            log.debug("推送功能已禁用，跳过发送");
            return false;
        }

        if (userIds == null || userIds.isEmpty()) {
            log.warn("用户列表为空，跳过推送");
            return false;
        }

        String platform = pushConfig.getPlatform();

        switch (platform.toLowerCase()) {
            case "jpush":
                return sendViaJPushBatch(userIds, title, body);
            case "webpush":
                return sendViaWebPushBatch(userIds, title, body);
            case "mock":
            default:
                return sendViaMockBatch(userIds, title, body);
        }
    }

    /**
     * 通过极光推送发送
     */
    private boolean sendViaJPush(Long userId, String title, String body) {
        if (!pushConfig.isJpushConfigured()) {
            log.warn("极光推送未配置完整，降级为模拟模式");
            return sendViaMock(userId, title, body);
        }

        return jPushService.sendPushByAlias(userId, title, body);
    }

    /**
     * 通过极光推送批量发送
     */
    private boolean sendViaJPushBatch(List<Long> userIds, String title, String body) {
        if (!pushConfig.isJpushConfigured()) {
            log.warn("极光推送未配置完整，降级为模拟模式");
            return sendViaMockBatch(userIds, title, body);
        }

        List<String> aliases = userIds.stream()
            .map(String::valueOf)
            .collect(Collectors.toList());

        return jPushService.sendPushByAliases(aliases, title, body);
    }

    /**
     * 通过 Web Push 发送
     * 生产环境需要接入 web-push Java 库
     */
    private boolean sendViaWebPush(Long userId, String title, String body) {
        if (!pushConfig.isWebPushConfigured()) {
            log.warn("Web Push 未配置完整，降级为模拟模式");
            return sendViaMock(userId, title, body);
        }

        List<PushSubscription> subscriptions = listByUser(userId);
        if (subscriptions.isEmpty()) {
            log.warn("用户 {} 没有可用的 Web Push 订阅", userId);
            return false;
        }

        // TODO: 生产环境接入 web-push Java 库
        // 当前为模拟发送
        for (PushSubscription sub : subscriptions) {
            log.info("【Web Push 模拟发送】用户 {}，端点 {}，标题：{}，内容：{}",
                userId, sub.getEndpoint(), title, body);
        }
        return true;
    }

    /**
     * 通过 Web Push 批量发送
     */
    private boolean sendViaWebPushBatch(List<Long> userIds, String title, String body) {
        if (!pushConfig.isWebPushConfigured()) {
            log.warn("Web Push 未配置完整，降级为模拟模式");
            return sendViaMockBatch(userIds, title, body);
        }

        boolean allSuccess = true;
        for (Long userId : userIds) {
            boolean success = sendViaWebPush(userId, title, body);
            if (!success) {
                allSuccess = false;
            }
        }
        return allSuccess;
    }

    /**
     * 模拟发送（用于演示环境）
     */
    private boolean sendViaMock(Long userId, String title, String body) {
        List<PushSubscription> subscriptions = listByUser(userId);
        if (subscriptions.isEmpty()) {
            log.warn("【模拟模式】用户 {} 没有推送订阅", userId);
            return false;
        }

        for (PushSubscription sub : subscriptions) {
            log.info("【模拟推送】用户 {}，标题：{}，内容：{}", userId, title, body);
        }
        return true;
    }

    /**
     * 模拟批量发送
     */
    private boolean sendViaMockBatch(List<Long> userIds, String title, String body) {
        boolean allSuccess = true;
        for (Long userId : userIds) {
            boolean success = sendViaMock(userId, title, body);
            if (!success) {
                allSuccess = false;
            }
        }
        return allSuccess;
    }
}