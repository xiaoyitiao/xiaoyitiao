package com.zhiyaoban.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 提醒计划实体
 * 存储用户设置的提醒规则配置
 */
@Data
@Entity
@Table(name = "reminder_schedules", indexes = {
    @Index(name = "idx_user_id", columnList = "user_id"),
    @Index(name = "idx_type_enabled", columnList = "type, enabled"),
    @Index(name = "idx_user_enabled", columnList = "user_id, enabled")
})
public class ReminderSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "用户ID不能为空")
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @NotBlank(message = "提醒计划名称不能为空")
    @Size(max = 100, message = "提醒计划名称不能超过100字符")
    @Column(nullable = false, length = 100)
    private String name;

    @NotNull(message = "提醒类型不能为空")
    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private ReminderType type = ReminderType.MEDICINE;

    @NotNull(message = "是否启用不能为空")
    @Column(nullable = false)
    private Boolean enabled = true;

    /**
     * 提前提醒分钟数，0表示不提前
     */
    @Column(name = "advance_minutes", nullable = false)
    private Integer advanceMinutes = 0;

    /**
     * 重复提醒次数，1表示不重复
     */
    @Column(name = "repeat_count", nullable = false)
    private Integer repeatCount = 1;

    /**
     * 重复提醒间隔分钟数
     */
    @Column(name = "repeat_interval_minutes", nullable = false)
    private Integer repeatIntervalMinutes = 30;

    /**
     * 提醒渠道
     */
    @NotNull(message = "提醒渠道不能为空")
    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private ReminderChannel channel = ReminderChannel.PUSH;

    /**
     * 免打扰开始时间
     */
    @Column(name = "quiet_hours_start")
    private LocalTime quietHoursStart;

    /**
     * 免打扰结束时间
     */
    @Column(name = "quiet_hours_end")
    private LocalTime quietHoursEnd;

    /**
     * 每周哪几天生效，逗号分隔 0-6，null表示每天
     */
    @Size(max = 50, message = "星期格式不能超过50字符")
    @Column(length = 50)
    private String weekDays;

    /**
     * 计划开始日期，null表示立即生效
     */
    @Column(name = "start_date")
    private LocalDate startDate;

    /**
     * 计划结束日期，null表示永久有效
     */
    @Column(name = "end_date")
    private LocalDate endDate;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "schedule", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<MedicineReminder> medicineReminders = new ArrayList<>();

    /**
     * 判断当前时间是否在免打扰时间内
     */
    public boolean isInQuietHours(LocalTime time) {
        if (quietHoursStart == null || quietHoursEnd == null) {
            return false;
        }
        if (quietHoursStart.isBefore(quietHoursEnd)) {
            return !time.isBefore(quietHoursStart) && time.isBefore(quietHoursEnd);
        } else {
            // 跨午夜的情况，如 22:00 - 08:00
            return !time.isBefore(quietHoursStart) || time.isBefore(quietHoursEnd);
        }
    }

    /**
     * 判断指定星期是否在计划内
     */
    public boolean isValidForDayOfWeek(int dayOfWeek) {
        if (weekDays == null || weekDays.isEmpty()) {
            return true; // 每天
        }
        String[] days = weekDays.split(",");
        for (String day : days) {
            try {
                if (Integer.parseInt(day.trim()) == dayOfWeek) {
                    return true;
                }
            } catch (NumberFormatException ignored) {
            }
        }
        return false;
    }

    /**
     * 判断指定日期是否在有效期内
     */
    public boolean isValidForDate(LocalDate date) {
        if (startDate != null && date.isBefore(startDate)) {
            return false;
        }
        if (endDate != null && date.isAfter(endDate)) {
            return false;
        }
        return true;
    }
}
