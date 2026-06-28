package com.zhiyaoban.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 药品实体
 * 记录老人的用药计划，包含剂量、时间、频率、库存等
 */
@Data
@Entity
@Table(name = "medicines", indexes = {
    @Index(name = "idx_user_id", columnList = "user_id"),
    @Index(name = "idx_time", columnList = "time")
})
public class Medicine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "用户ID不能为空")
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @NotBlank(message = "药品名称不能为空")
    @Size(max = 100, message = "药品名称长度不能超过100个字符")
    @Column(nullable = false, length = 100)
    private String name;

    @Size(max = 50, message = "剂量长度不能超过50个字符")
    @Column(length = 50)
    private String dose;

    @Size(max = 50, message = "实际剂量长度不能超过50个字符")
    @Column(name = "actual_dose", length = 50)
    private String actualDose;

    @NotBlank(message = "服药时间不能为空")
    @Pattern(regexp = "^([01]?[0-9]|2[0-3]):[0-5][0-9]$", message = "时间格式不正确，应为HH:MM")
    @Column(nullable = false, length = 10)
    private String time;

    @NotNull(message = "用药频率不能为空")
    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private MedicineFrequency frequency = MedicineFrequency.DAILY;

    @Size(max = 50, message = "星期几长度不能超过50个字符")
    @Column(name = "week_days", length = 50)
    private String weekDays;

    @Min(value = 1, message = "间隔天数至少为1")
    @Column(name = "interval_days")
    private Integer intervalDays = 1;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Min(value = 0, message = "库存不能为负数")
    @Column
    private Integer stock = 0;

    @Size(max = 255, message = "备注长度不能超过255个字符")
    @Column(length = 255)
    private String note;

    @Size(max = 20, message = "图标长度不能超过20个字符")
    @Column(length = 20)
    private String icon = "💊";

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
