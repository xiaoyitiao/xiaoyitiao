package com.zhiyaoban.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * 药品提醒关联实体
 * 将药品与提醒计划关联，支持一个药品多个提醒时间
 */
@Data
@Entity
@Table(name = "medicine_reminders", indexes = {
    @Index(name = "idx_medicine_id", columnList = "medicine_id"),
    @Index(name = "idx_schedule_id", columnList = "schedule_id"),
    @Index(name = "idx_medicine_remind_time", columnList = "medicine_id, remind_time")
}, uniqueConstraints = {
    @UniqueConstraint(name = "uk_schedule_medicine_time", columnNames = {"schedule_id", "medicine_id", "remind_time"})
})
public class MedicineReminder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "提醒计划ID不能为空")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "schedule_id", nullable = false)
    private ReminderSchedule schedule;

    @NotNull(message = "药品ID不能为空")
    @Column(name = "medicine_id", nullable = false)
    private Long medicineId;

    @NotNull(message = "提醒时间不能为空")
    @Column(name = "remind_time", nullable = false)
    private LocalTime remindTime;

    /**
     * 提醒剂量，可覆盖药品默认剂量
     */
    @Size(max = 50, message = "剂量不能超过50字符")
    @Column(length = 50)
    private String dose;

    @NotNull(message = "是否启用不能为空")
    @Column(nullable = false)
    private Boolean enabled = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medicine_id", insertable = false, updatable = false)
    private Medicine medicine;
}
