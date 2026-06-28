package com.zhiyaoban.service;

import cn.jpush.api.JPushClient;
import cn.jpush.api.push.PushResult;
import cn.jpush.api.push.model.Message;
import cn.jpush.api.push.model.Platform;
import cn.jpush.api.push.model.PushPayload;
import cn.jpush.api.push.model.SMS;
import cn.jpush.api.push.model.audience.Audience;
import cn.jpush.api.push.model.audience.AudienceTarget;
import cn.jpush.api.push.model.notification.AndroidNotification;
import cn.jpush.api.push.model.notification.IosNotification;
import cn.jpush.api.push.model.notification.Notification;
import com.zhiyaoban.config.PushConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 极光推送服务
 * 用于发送移动端推送通知
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class JPushService {

    private final PushConfig pushConfig;

    private JPushClient jPushClient;

    /**
     * 初始化极光推送客户端
     */
    private void initClient() {
        if (jPushClient != null) {
            return;
        }

        if (!pushConfig.isJpushConfigured()) {
            log.warn("极光推送未配置完整，跳过初始化");
            return;
        }

        jPushClient = new JPushClient(
            pushConfig.getJpushMasterSecret(),
            pushConfig.getJpushAppKey()
        );
    }

    /**
     * 发送推送通知给指定用户（通过别名）
     * @param userId 用户ID（作为极光别名）
     * @param title 通知标题
     * @param content 通知内容
     * @return 是否发送成功
     */
    public boolean sendPushByAlias(Long userId, String title, String content) {
        return sendPushByAlias(String.valueOf(userId), title, content);
    }

    /**
     * 发送推送通知给指定用户（通过别名）
     * @param alias 用户别名
     * @param title 通知标题
     * @param content 通知内容
     * @return 是否发送成功
     */
    public boolean sendPushByAlias(String alias, String title, String content) {
        if (!pushConfig.isJpushConfigured()) {
            log.warn("极光推送未配置完整，跳过发送");
            return false;
        }

        try {
            initClient();

            PushPayload payload = buildPushPayloadByAlias(alias, title, content);
            PushResult result = jPushClient.sendPush(payload);

            if (result.isResultOK()) {
                log.info("极光推送发送成功，别名: {}", alias);
                return true;
            } else {
                log.error("极光推送发送失败，别名: {}, ResponseCode: {}",
                    alias, result.getResponseCode());
                return false;
            }

        } catch (Exception e) {
            log.error("极光推送发送异常，别名: {}, 异常: {}", alias, e.getMessage(), e);
            return false;
        }
    }

    /**
     * 发送推送通知给多个用户（通过别名）
     * @param aliases 用户别名列表
     * @param title 通知标题
     * @param content 通知内容
     * @return 是否发送成功
     */
    public boolean sendPushByAliases(List<String> aliases, String title, String content) {
        if (!pushConfig.isJpushConfigured()) {
            log.warn("极光推送未配置完整，跳过发送");
            return false;
        }

        if (aliases == null || aliases.isEmpty()) {
            log.warn("别名列表为空，跳过推送");
            return false;
        }

        try {
            initClient();

            PushPayload payload = buildPushPayloadByAliases(aliases, title, content);
            PushResult result = jPushClient.sendPush(payload);

            if (result.isResultOK()) {
                log.info("极光推送批量发送成功，数量: {}", aliases.size());
                return true;
            } else {
                log.error("极光推送批量发送失败，ResponseCode: {}",
                    result.getResponseCode());
                return false;
            }

        } catch (Exception e) {
            log.error("极光推送批量发送异常，数量: {}, 异常: {}", aliases.size(), e.getMessage(), e);
            return false;
        }
    }

    /**
     * 发送广播推送（所有用户）
     * @param title 通知标题
     * @param content 通知内容
     * @return 是否发送成功
     */
    public boolean sendBroadcast(String title, String content) {
        if (!pushConfig.isJpushConfigured()) {
            log.warn("极光推送未配置完整，跳过发送");
            return false;
        }

        try {
            initClient();

            PushPayload payload = buildBroadcastPayload(title, content);
            PushResult result = jPushClient.sendPush(payload);

            if (result.isResultOK()) {
                log.info("极光推送广播发送成功");
                return true;
            } else {
                log.error("极光推送广播发送失败，ResponseCode: {}",
                    result.getResponseCode());
                return false;
            }

        } catch (Exception e) {
            log.error("极光推送广播发送异常: {}", e.getMessage(), e);
            return false;
        }
    }

    /**
     * 构建单用户推送Payload
     */
    private PushPayload buildPushPayloadByAlias(String alias, String title, String content) {
        String fullTitle = pushConfig.getJpushTitlePrefix() + " - " + title;

        return PushPayload.newBuilder()
            .setPlatform(Platform.android_ios())
            .setAudience(Audience.alias(alias))
            .setNotification(Notification.newBuilder()
                .setAlert(content)
                .addPlatformNotification(AndroidNotification.newBuilder()
                    .setTitle(fullTitle)
                    .setAlert(content)
                    .build())
                .addPlatformNotification(IosNotification.newBuilder()
                    .setAlert(content)
                    .setSound("default")
                    .build())
                .build())
            .setMessage(Message.content(content))
            .build();
    }

    /**
     * 构建批量用户推送Payload
     */
    private PushPayload buildPushPayloadByAliases(List<String> aliases, String title, String content) {
        String fullTitle = pushConfig.getJpushTitlePrefix() + " - " + title;

        return PushPayload.newBuilder()
            .setPlatform(Platform.android_ios())
            .setAudience(Audience.newBuilder()
                .addAudienceTarget(AudienceTarget.alias(aliases))
                .build())
            .setNotification(Notification.newBuilder()
                .setAlert(content)
                .addPlatformNotification(AndroidNotification.newBuilder()
                    .setTitle(fullTitle)
                    .setAlert(content)
                    .build())
                .addPlatformNotification(IosNotification.newBuilder()
                    .setAlert(content)
                    .setSound("default")
                    .build())
                .build())
            .setMessage(Message.content(content))
            .build();
    }

    /**
     * 构建广播推送Payload
     */
    private PushPayload buildBroadcastPayload(String title, String content) {
        String fullTitle = pushConfig.getJpushTitlePrefix() + " - " + title;

        return PushPayload.newBuilder()
            .setPlatform(Platform.android_ios())
            .setAudience(Audience.all())
            .setNotification(Notification.newBuilder()
                .setAlert(content)
                .addPlatformNotification(AndroidNotification.newBuilder()
                    .setTitle(fullTitle)
                    .setAlert(content)
                    .build())
                .addPlatformNotification(IosNotification.newBuilder()
                    .setAlert(content)
                    .setSound("default")
                    .build())
                .build())
            .setMessage(Message.content(content))
            .build();
    }
}