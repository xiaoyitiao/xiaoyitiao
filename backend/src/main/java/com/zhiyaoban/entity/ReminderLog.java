package com.zhiyaoban.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 提醒发送日志实体
 * 后端定时任务发送 Web Push / 短信 / 电话时记录
 */
@Data
@Entity
@Table(name = "reminder_logs", indexes = {
    @Index(name = "idx_user_date", columnList = "user_id,date"),
    @Index(name = "idx_status", columnList = "status")
})
public class ReminderLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "用户ID不能为空")
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @NotNull(message = "药品ID不能为空")
    @Column(name = "medicine_id", nullable = false)
    private Long medicineId;

    @NotNull(message = "提醒日期不能为空")
    @Column(nullable = false)
    private LocalDate date;

    @NotNull(message = "提醒类型不能为空")
    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private ReminderType type;

    @NotNull(message = "提醒渠道不能为空")
    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private ReminderChannel channel = ReminderChannel.PUSH;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @NotNull(message = "状态不能为空")
    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private ReminderStatus status = ReminderStatus.PENDING;

    @Size(max = 500, message = "错误信息长度不能超过500个字符")
    @Column(name = "error_msg", length = 500)
    private String errorMsg;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /**
     * 关联的提醒计划ID
     */
    @Column(name = "schedule_id")
    private Long scheduleId;

    /**
     * 收到通知的家属用户ID
     */
    @Column(name = "family_user_id")
    private Long familyUserId;

    /**
     * 通知标题
     */
    @Size(max = 100, message = "标题长度不能超过100字符")
    @Column(length = 100)
    private String title;

    /**
     * 通知内容
     */
    @Size(max = 500, message = "内容长度不能超过500字符")
    @Column(length = 500)
    private String content;

    /**
     * 重试次数
     */
    @Column(name = "retry_count", nullable = false)
    private Integer retryCount = 0;

    /**
     * 用户查看时间
     */
    @Column(name = "read_at")
    private LocalDateTime readAt;
}
