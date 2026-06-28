package com.zhiyaoban.dto;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 提醒日志DTO
 */
@Data
public class ReminderLogDto {

    private Long id;

    private Long userId;

    private Long medicineId;

    private String medicineName;

    private LocalDate date;

    private String type;

    private String channel;

    private LocalDateTime sentAt;

    private String status;

    private String errorMsg;

    private LocalDateTime createdAt;

    private Long scheduleId;

    private Long familyUserId;

    private String title;

    private String content;

    private Integer retryCount;

    private LocalDateTime readAt;
}