package com.zhiyaoban.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;

@Data
public class MedicineDto {
    private Long id;

    @NotBlank(message = "药品名称不能为空")
    private String name;

    private String dose;
    private String actualDose;

    @NotBlank(message = "服药时间不能为空")
    private String time;

    private String frequency = "daily";
    private String weekDays;
    private Integer intervalDays = 1;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer stock;
    private String note;
    private String icon;
}
