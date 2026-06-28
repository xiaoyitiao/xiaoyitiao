package com.zhiyaoban.service;

import com.zhiyaoban.config.SmsConfig;
import com.zhiyaoban.dto.SmsRequest;
import com.zhiyaoban.entity.SmsCode;
import com.zhiyaoban.entity.User;
import com.zhiyaoban.entity.UserRole;
import com.zhiyaoban.repository.SmsCodeRepository;
import com.zhiyaoban.repository.UserRepository;
import com.zhiyaoban.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * 认证服务单元测试
 * 测试短信验证码发送逻辑
 */
@ExtendWith(MockitoExtension.class)
public class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private SmsCodeRepository smsCodeRepository;

    @Mock
    private JwtUtil jwtUtil;

    @Mock
    private SmsConfig smsConfig;

    @Mock
    private AliyunSmsService aliyunSmsService;

    @InjectMocks
    private AuthService authService;

    private SmsRequest smsRequest;

    @BeforeEach
    void setUp() {
        smsRequest = new SmsRequest();
        smsRequest.setPhone("13800138000");
    }

    @Test
    @DisplayName("sendSmsCode Mock 模式应使用固定验证码")
    void sendSmsCode_usesFixedCode_whenMockMode() {
        // Given
        when(smsConfig.getMock()).thenReturn(true);
        when(smsConfig.getFixedCode()).thenReturn("123456");
        when(smsConfig.getExpireMinutes()).thenReturn(5);

        // When
        authService.sendSmsCode(smsRequest);

        // Then
        ArgumentCaptor<SmsCode> captor = ArgumentCaptor.forClass(SmsCode.class);
        verify(smsCodeRepository).save(captor.capture());

        SmsCode savedCode = captor.getValue();
        assertEquals("13800138000", savedCode.getPhone());
        assertEquals("123456", savedCode.getCode());
        assertFalse(savedCode.getUsed());
        assertEquals(LocalDateTime.now().plusMinutes(5).getHour(), savedCode.getExpireAt().getHour());

        // 验证没有调用阿里云短信服务
        verifyNoInteractions(aliyunSmsService);
    }

    @Test
    @DisplayName("sendSmsCode 非 Mock 模式且已配置阿里云应调用真实发送")
    void sendSmsCode_callsAliyun_whenNotMockAndConfigured() {
        // Given
        when(smsConfig.getMock()).thenReturn(false);
        when(smsConfig.isAliyunConfigured()).thenReturn(true);
        when(smsConfig.getExpireMinutes()).thenReturn(5);
        when(aliyunSmsService.sendVerificationCode(eq("13800138000"), anyString())).thenReturn(true);

        // When
        authService.sendSmsCode(smsRequest);

        // Then
        ArgumentCaptor<SmsCode> captor = ArgumentCaptor.forClass(SmsCode.class);
        verify(smsCodeRepository).save(captor.capture());

        SmsCode savedCode = captor.getValue();
        assertEquals("13800138000", savedCode.getPhone());
        assertEquals(6, savedCode.getCode().length()); // 6位验证码
        assertFalse(savedCode.getUsed());

        // 验证调用了阿里云短信服务
        verify(aliyunSmsService).sendVerificationCode(eq("13800138000"), anyString());
    }

    @Test
    @DisplayName("sendSmsCode 非 Mock 但阿里云未配置应记录日志但仍保存验证码")
    void sendSmsCode_savesCodeEvenIfAliyunNotConfigured() {
        // Given
        when(smsConfig.getMock()).thenReturn(false);
        when(smsConfig.isAliyunConfigured()).thenReturn(false);
        when(smsConfig.getExpireMinutes()).thenReturn(5);

        // When
        authService.sendSmsCode(smsRequest);

        // Then
        ArgumentCaptor<SmsCode> captor = ArgumentCaptor.forClass(SmsCode.class);
        verify(smsCodeRepository).save(captor.capture());

        SmsCode savedCode = captor.getValue();
        assertEquals("13800138000", savedCode.getPhone());
        assertEquals(6, savedCode.getCode().length());

        // 验证没有调用阿里云短信服务（因为未配置）
        verifyNoInteractions(aliyunSmsService);
    }

    @Test
    @DisplayName("sendSmsCode 阿里云发送失败应抛出异常")
    void sendSmsCode_throwsException_whenAliyunFails() {
        // Given
        when(smsConfig.getMock()).thenReturn(false);
        when(smsConfig.isAliyunConfigured()).thenReturn(true);
        when(smsConfig.getExpireMinutes()).thenReturn(5);
        when(aliyunSmsService.sendVerificationCode(anyString(), anyString())).thenReturn(false);

        // When & Then
        assertThrows(RuntimeException.class, () -> authService.sendSmsCode(smsRequest));

        // 验证验证码未被保存
        verify(smsCodeRepository, never()).save(any());
    }
}
