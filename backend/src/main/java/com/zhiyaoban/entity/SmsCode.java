package com.zhiyaoban.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * 短信验证码实体
 */
@Data
@Entity
@Table(name = "sms_codes", indexes = {
    @Index(name = "idx_phone", columnList = "phone"),
    @Index(name = "idx_expire_at", columnList = "expire_at")
})
public class SmsCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "手机号不能为空")
    @Pattern(regexp = "^1[3-9]\\d{9}$", message = "手机号格式不正确")
    @Column(nullable = false, length = 20)
    private String phone;

    @NotBlank(message = "验证码不能为空")
    @Size(min = 4, max = 10, message = "验证码长度应在4-10位之间")
    @Column(nullable = false, length = 10)
    private String code;

    @NotNull(message = "使用状态不能为空")
    @Column(nullable = false)
    private Boolean used = false;
    
    /**
     * 验证码尝试次数（用于防止暴力破解）
     */
    @Column(name = "attempt_count", nullable = false)
    private Integer attemptCount = 0;

    @NotNull(message = "过期时间不能为空")
    @Column(name = "expire_at", nullable = false)
    private LocalDateTime expireAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
