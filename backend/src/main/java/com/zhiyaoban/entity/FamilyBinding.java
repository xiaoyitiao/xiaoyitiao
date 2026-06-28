package com.zhiyaoban.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * 家人绑定关系实体
 * 老人与家属之间的绑定关系
 */
@Data
@Entity
@Table(name = "family_bindings", indexes = {
    @Index(name = "idx_elder_user_id", columnList = "elder_user_id"),
    @Index(name = "idx_family_user_id", columnList = "family_user_id")
}, uniqueConstraints = {
    @UniqueConstraint(name = "uk_elder_family", columnNames = {"elder_user_id", "family_user_id"})
})
public class FamilyBinding {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "老人用户ID不能为空")
    @Column(name = "elder_user_id", nullable = false)
    private Long elderUserId;

    @NotNull(message = "家属用户ID不能为空")
    @Column(name = "family_user_id", nullable = false)
    private Long familyUserId;

    @Size(max = 20, message = "关系长度不能超过20个字符")
    @Column(length = 20)
    private String relation;

    @NotNull(message = "状态不能为空")
    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private BindingStatus status = BindingStatus.ACTIVE;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
