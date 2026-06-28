package com.zhiyaoban.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Web Push 订阅实体
 * 老人端订阅后，后端可在浏览器关闭时仍推送提醒
 */
@Data
@Entity
@Table(name = "push_subscriptions", indexes = {
    @Index(name = "idx_user_id", columnList = "user_id")
}, uniqueConstraints = {
    @UniqueConstraint(name = "uk_user_endpoint", columnNames = {"user_id", "endpoint"})
})
public class PushSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "用户ID不能为空")
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @NotBlank(message = "推送端点不能为空")
    @Column(nullable = false, length = 512)
    private String endpoint;

    @NotBlank(message = "公钥不能为空")
    @Column(nullable = false, length = 255)
    private String p256dh;

    @NotBlank(message = "鉴权密钥不能为空")
    @Column(nullable = false, length = 255)
    private String auth;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
