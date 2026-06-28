package com.zhiyaoban.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/**
 * 提醒计划DTO
 */
@Data
public class ReminderScheduleDto {

    private Long id;

    private Long userId;

    @NotBlank(message = "提醒计划名称不能为空")
    @Size(max = 100, message = "提醒计划名称不能超过100字符")
    private String name;

    @NotBlank(message = "提醒类型不能为空")
    private String type;

    private Boolean enabled = true;

    private Integer advanceMinutes = 0;

    private Integer repeatCount = 1;

    private Integer repeatIntervalMinutes = 30;

    private String channel = "PUSH";

    private LocalTime quietHoursStart;

    private LocalTime quietHoursEnd;

    private String weekDays;

    private LocalDate startDate;

    private LocalDate endDate;

    private List<MedicineReminderItem> medicineItems;

    @Data
    public static class MedicineReminderItem {
        private Long medicineId;
        private LocalTime remindTime;
        private String dose;
        private Boolean enabled = true;
    }
}
