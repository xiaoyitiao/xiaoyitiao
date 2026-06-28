package com.zhiyaoban.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 用药打卡记录实体
 */
@Data
@Entity
@Table(name = "check_ins", indexes = {
    @Index(name = "idx_user_date", columnList = "user_id,date"),
    @Index(name = "idx_date", columnList = "date")
}, uniqueConstraints = {
    @UniqueConstraint(name = "uk_user_med_date", columnNames = {"user_id", "medicine_id", "date"})
})
public class CheckIn {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "用户ID不能为空")
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @NotNull(message = "药品ID不能为空")
    @Column(name = "medicine_id", nullable = false)
    private Long medicineId;

    @NotNull(message = "打卡日期不能为空")
    @Column(nullable = false)
    private LocalDate date;

    @NotNull(message = "打卡时间不能为空")
    @Column(name = "taken_at", nullable = false)
    private LocalDateTime takenAt;

    @Size(max = 50, message = "剂量长度不能超过50个字符")
    @Column(length = 50)
    private String dose;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
