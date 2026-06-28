package com.zhiyaoban.service;

import com.zhiyaoban.config.SmsConfig;
import com.zhiyaoban.dto.LoginRequest;
import com.zhiyaoban.dto.SmsRequest;
import com.zhiyaoban.dto.TokenResponse;
import com.zhiyaoban.entity.SmsCode;
import com.zhiyaoban.entity.User;
import com.zhiyaoban.entity.UserRole;
import com.zhiyaoban.exception.AuthenticationFailedException;
import com.zhiyaoban.exception.SmsSendFailedException;
import com.zhiyaoban.repository.SmsCodeRepository;
import com.zhiyaoban.repository.UserRepository;
import com.zhiyaoban.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Random;

/**
 * 认证服务
 * 负责手机号验证码登录
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final SmsCodeRepository smsCodeRepository;
    private final JwtUtil jwtUtil;
    private final SmsConfig smsConfig;
    private final AliyunSmsService aliyunSmsService;

    private final Random random = new Random();

    /**
     * 发送短信验证码
     * 演示模式直接返回固定验证码；生产环境接入阿里云短信 SDK
     * 添加频率限制：同一手机号 60 秒内只能发送一次，每天最多 10 次
     */
    @Transactional
    public void sendSmsCode(SmsRequest request) {
        String phone = request.getPhone();
        
        // 验证码发送频率限制检查
        checkSendFrequency(phone);
        
        String code;

        if (Boolean.TRUE.equals(smsConfig.getMock())) {
            code = smsConfig.getFixedCode();
            log.warn("【演示模式】已为手机号 {} 设置验证码，生产环境请关闭 mock 并接入真实短信通道", phone);
        } else {
            code = String.format("%06d", random.nextInt(1000000));

            // 阿里云短信发送
            if (smsConfig.isAliyunConfigured()) {
                boolean success = aliyunSmsService.sendVerificationCode(phone, code);
                if (!success) {
                    log.error("阿里云短信发送失败，手机号: {}", phone);
                    throw new SmsSendFailedException("短信发送失败，请稍后重试");
                }
                log.info("已通过阿里云短信向手机号 {} 发送验证码", phone);
            } else {
                log.warn("未配置阿里云短信，手机号 {} 的验证码仅记录日志，未实际发送", phone);
            }
        }

        SmsCode smsCode = new SmsCode();
        smsCode.setPhone(phone);
        smsCode.setCode(code);
        smsCode.setUsed(false);
        smsCode.setAttemptCount(0);
        smsCode.setExpireAt(LocalDateTime.now().plusMinutes(smsConfig.getExpireMinutes()));
        smsCodeRepository.save(smsCode);
    }

    /**
     * 验证码登录
     * 添加尝试次数限制：同一手机号 5 分钟内最多尝试 5 次
     */
    @Transactional
    public TokenResponse login(LoginRequest request) {
        String phone = request.getPhone();
        String code = request.getCode();

        Optional<SmsCode> latestOpt = smsCodeRepository
            .findTopByPhoneAndUsedFalseAndExpireAtAfterOrderByCreatedAtDesc(phone, LocalDateTime.now());

        if (latestOpt.isEmpty()) {
            throw new AuthenticationFailedException("验证码已过期，请重新获取");
        }

        SmsCode smsCode = latestOpt.get();
        
        // 检查尝试次数是否超限
        if (smsCode.getAttemptCount() >= 5) {
            throw new AuthenticationFailedException("验证码尝试次数过多，请重新获取验证码");
        }
        
        // 增加尝试次数
        smsCode.setAttemptCount(smsCode.getAttemptCount() + 1);
        smsCodeRepository.save(smsCode);
        
        if (!smsCode.getCode().equals(code)) {
            throw new AuthenticationFailedException("验证码错误");
        }

        smsCode.setUsed(true);
        smsCodeRepository.save(smsCode);

        User user = userRepository.findByPhone(phone)
            .orElseGet(() -> {
                User newUser = new User();
                newUser.setPhone(phone);
                newUser.setName(phone);
                newUser.setRole(UserRole.ELDER);
                return userRepository.save(newUser);
            });

        String token = jwtUtil.generateToken(user.getPhone(), user.getId(), user.getRole().name());
        return new TokenResponse(token, user.getPhone(), user.getRole().name(), user.getId(), 604800L);
    }

    /**
     * 刷新Token
     */
    public TokenResponse refreshToken(User user) {
        String token = jwtUtil.generateToken(user.getPhone(), user.getId(), user.getRole().name());
        return new TokenResponse(token, user.getPhone(), user.getRole().name(), user.getId(), 604800L);
    }

    /**
     * 验证Token是否有效
     */
    public boolean validateToken(String token) {
        return jwtUtil.validateToken(token);
    }
    
    /**
     * 验证码发送频率限制检查
     * 同一手机号 60 秒内只能发送一次，每天最多发送 10 次
     */
    private void checkSendFrequency(String phone) {
        LocalDateTime now = LocalDateTime.now();
        
        // 检查最近 60 秒内是否已发送
        Optional<SmsCode> recentSms = smsCodeRepository.findTopByPhoneOrderByCreatedAtDesc(phone);
        if (recentSms.isPresent()) {
            LocalDateTime lastSendTime = recentSms.get().getCreatedAt();
            if (lastSendTime.isAfter(now.minusSeconds(60))) {
                throw new SmsSendFailedException("发送频率过快，请 60 秒后再试");
            }
        }
        
        // 检查今天是否已发送超过 10 次
        LocalDateTime todayStart = now.toLocalDate().atStartOfDay();
        List<SmsCode> todaySmsCodes = smsCodeRepository.findByPhoneAndCreatedAtAfter(phone, todayStart);
        if (todaySmsCodes.size() >= 10) {
            throw new SmsSendFailedException("今日发送次数已达上限，请明天再试");
        }
    }
}
