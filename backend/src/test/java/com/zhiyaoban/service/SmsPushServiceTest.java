package com.zhiyaoban.service;

import com.zhiyaoban.config.PushConfig;
import com.zhiyaoban.config.SmsConfig;
import com.zhiyaoban.dto.PushSubscriptionDto;
import com.zhiyaoban.entity.PushSubscription;
import com.zhiyaoban.entity.User;
import com.zhiyaoban.repository.PushSubscriptionRepository;
import com.zhiyaoban.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * 短信和推送服务单元测试
 * 测试 Mock 模式下的验证码发送和推送逻辑
 */
@ExtendWith(MockitoExtension.class)
public class SmsPushServiceTest {

    // ==================== SmsConfig Mock 测试 ====================

    @Nested
    @DisplayName("SmsConfig 配置测试")
    class SmsConfigTests {

        @Test
        @DisplayName("isAliyunConfigured 应返回 false 当配置为空")
        void isAliyunConfigured_returnsFalse_whenConfigEmpty() {
            SmsConfig config = new SmsConfig();
            assertFalse(config.isAliyunConfigured());
        }

        @Test
        @DisplayName("isAliyunConfigured 应返回 false 当只有部分配置")
        void isAliyunConfigured_returnsFalse_whenPartialConfig() {
            SmsConfig config = new SmsConfig();
            config.setAccessKeyId("test-key");
            // accessKeySecret, signName, templateCode 为空
            assertFalse(config.isAliyunConfigured());
        }

        @Test
        @DisplayName("isAliyunConfigured 应返回 true 当配置完整")
        void isAliyunConfigured_returnsTrue_whenAllConfigProvided() {
            SmsConfig config = new SmsConfig();
            config.setAccessKeyId("test-key-id");
            config.setAccessKeySecret("test-key-secret");
            config.setSignName("智药伴");
            config.setTemplateCode("SMS_123456789");
            assertTrue(config.isAliyunConfigured());
        }
    }

    // ==================== PushConfig Mock 测试 ====================

    @Nested
    @DisplayName("PushConfig 配置测试")
    class PushConfigTests {

        @Test
        @DisplayName("isJpushConfigured 应返回 false 当配置为空")
        void isJpushConfigured_returnsFalse_whenEmpty() {
            PushConfig config = new PushConfig();
            assertFalse(config.isJpushConfigured());
        }

        @Test
        @DisplayName("isJpushConfigured 应返回 true 当配置完整")
        void isJpushConfigured_returnsTrue_whenAllConfigProvided() {
            PushConfig config = new PushConfig();
            config.setJpushAppKey("test-app-key");
            config.setJpushMasterSecret("test-master-secret");
            assertTrue(config.isJpushConfigured());
        }

        @Test
        @DisplayName("isWebPushConfigured 应返回 false 当配置为空")
        void isWebPushConfigured_returnsFalse_whenEmpty() {
            PushConfig config = new PushConfig();
            assertFalse(config.isWebPushConfigured());
        }

        @Test
        @DisplayName("isWebPushConfigured 应返回 true 当配置完整")
        void isWebPushConfigured_returnsTrue_whenAllConfigProvided() {
            PushConfig config = new PushConfig();
            config.setVapidPublicKey("test-public-key");
            config.setVapidPrivateKey("test-private-key");
            assertTrue(config.isWebPushConfigured());
        }
    }

    // ==================== PushService Mock 模式测试 ====================

    @Nested
    @DisplayName("PushService Mock 模式测试")
    class PushServiceMockTests {

        @Mock
        private PushSubscriptionRepository pushSubscriptionRepository;

        @Mock
        private PushConfig pushConfig;

        @Mock
        private JPushService jPushService;

        @InjectMocks
        private PushService pushService;

        private PushSubscription subscription;
        private Long userId;

        @BeforeEach
        void setUp() {
            userId = 1001L;

            subscription = new PushSubscription();
            subscription.setId(1L);
            subscription.setUserId(userId);
            subscription.setEndpoint("https://example.com/push");
            subscription.setP256dh("test-p256dh");
            subscription.setAuth("test-auth");
        }

        @Test
        @DisplayName("sendPush 应返回 false 当推送已禁用")
        void sendPush_returnsFalse_whenDisabled() {
            when(pushConfig.isEnabled()).thenReturn(false);

            boolean result = pushService.sendPush(userId, "测试标题", "测试内容");

            assertFalse(result);
            verify(pushConfig).isEnabled();
            verifyNoInteractions(jPushService);
        }

        @Test
        @DisplayName("sendPush 应使用 Mock 模式发送当 platform=mock")
        void sendPush_usesMockMode_whenPlatformIsMock() {
            when(pushConfig.isEnabled()).thenReturn(true);
            when(pushConfig.getPlatform()).thenReturn("mock");
            when(pushSubscriptionRepository.findByUserId(userId)).thenReturn(List.of(subscription));

            boolean result = pushService.sendPush(userId, "测试标题", "测试内容");

            assertTrue(result);
            verify(pushSubscriptionRepository).findByUserId(userId);
            verifyNoInteractions(jPushService);
        }

        @Test
        @DisplayName("sendPush 应使用 Mock 模式发送当 platform 不支持")
        void sendPush_usesMockMode_whenPlatformUnknown() {
            when(pushConfig.isEnabled()).thenReturn(true);
            when(pushConfig.getPlatform()).thenReturn("unknown");
            when(pushSubscriptionRepository.findByUserId(userId)).thenReturn(List.of(subscription));

            boolean result = pushService.sendPush(userId, "测试标题", "测试内容");

            assertTrue(result);
        }

        @Test
        @DisplayName("sendPush 应使用极光推送当 platform=jpush 且已配置")
        void sendPush_usesJPush_whenPlatformIsJpush() {
            when(pushConfig.isEnabled()).thenReturn(true);
            when(pushConfig.getPlatform()).thenReturn("jpush");
            when(pushConfig.isJpushConfigured()).thenReturn(true);
            when(jPushService.sendPushByAlias(eq(userId), anyString(), anyString())).thenReturn(true);

            boolean result = pushService.sendPush(userId, "测试标题", "测试内容");

            assertTrue(result);
            verify(jPushService).sendPushByAlias(eq(userId), eq("测试标题"), eq("测试内容"));
        }

        @Test
        @DisplayName("sendPush 应降级到 Mock 当 platform=jpush 但未配置极光")
        void sendPush_fallbackToMock_whenJpushNotConfigured() {
            when(pushConfig.isEnabled()).thenReturn(true);
            when(pushConfig.getPlatform()).thenReturn("jpush");
            when(pushConfig.isJpushConfigured()).thenReturn(false);
            when(pushSubscriptionRepository.findByUserId(userId)).thenReturn(List.of(subscription));

            boolean result = pushService.sendPush(userId, "测试标题", "测试内容");

            assertTrue(result);
            verify(pushSubscriptionRepository).findByUserId(userId);
            verifyNoInteractions(jPushService);
        }

        @Test
        @DisplayName("sendPush 应返回 false 当用户没有订阅")
        void sendPush_returnsFalse_whenNoSubscription() {
            when(pushConfig.isEnabled()).thenReturn(true);
            when(pushConfig.getPlatform()).thenReturn("mock");
            when(pushSubscriptionRepository.findByUserId(userId)).thenReturn(List.of());

            boolean result = pushService.sendPush(userId, "测试标题", "测试内容");

            assertFalse(result);
        }

        @Test
        @DisplayName("sendPushToUsers 应批量发送推送")
        void sendPushToUsers_sendsBatchPush() {
            List<Long> userIds = List.of(1001L, 1002L, 1003L);
            when(pushConfig.isEnabled()).thenReturn(true);
            when(pushConfig.getPlatform()).thenReturn("mock");
            when(pushSubscriptionRepository.findByUserId(anyLong())).thenReturn(List.of(subscription));

            boolean result = pushService.sendPushToUsers(userIds, "批量推送", "批量测试内容");

            assertTrue(result);
            verify(pushSubscriptionRepository, times(3)).findByUserId(anyLong());
        }

        @Test
        @DisplayName("sendPushToUsers 应返回 false 当用户列表为空")
        void sendPushToUsers_returnsFalse_whenListEmpty() {
            when(pushConfig.isEnabled()).thenReturn(true);

            boolean result = pushService.sendPushToUsers(List.of(), "测试标题", "测试内容");

            assertFalse(result);
            verifyNoInteractions(pushSubscriptionRepository);
        }
    }

    // ==================== PushSubscription 保存测试 ====================

    @Nested
    @DisplayName("PushSubscription 保存测试")
    class SaveSubscriptionTests {

        @Mock
        private PushSubscriptionRepository pushSubscriptionRepository;

        @Mock
        private PushConfig pushConfig;

        @Mock
        private JPushService jPushService;

        @InjectMocks
        private PushService pushService;

        @Test
        @DisplayName("saveSubscription 应正确保存订阅信息")
        void saveSubscription_savesCorrectly() {
            Long userId = 1001L;
            PushSubscriptionDto dto = new PushSubscriptionDto();
            dto.setEndpoint("https://example.com/push");
            dto.setP256dh("test-p256dh");
            dto.setAuth("test-auth");

            pushService.saveSubscription(userId, dto);

            verify(pushSubscriptionRepository).save(argThat(subscription ->
                subscription.getUserId().equals(userId) &&
                subscription.getEndpoint().equals("https://example.com/push") &&
                subscription.getP256dh().equals("test-p256dh") &&
                subscription.getAuth().equals("test-auth")
            ));
        }
    }
}
