package com.zhiyaoban.repository;

import com.zhiyaoban.entity.SmsCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SmsCodeRepository extends JpaRepository<SmsCode, Long> {
    Optional<SmsCode> findTopByPhoneAndUsedFalseAndExpireAtAfterOrderByCreatedAtDesc(String phone, LocalDateTime now);
    
    /**
     * 查询指定手机号在指定时间之后发送的所有验证码（用于频率限制）
     */
    List<SmsCode> findByPhoneAndCreatedAtAfter(String phone, LocalDateTime after);
    
    /**
     * 查询指定手机号最近一次发送的验证码（用于频率限制）
     */
    Optional<SmsCode> findTopByPhoneOrderByCreatedAtDesc(String phone);
}
