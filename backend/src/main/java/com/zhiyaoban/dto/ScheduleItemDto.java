package com.zhiyaoban.dto;

import lombok.Data;

/**
 * 今日用药计划项
 */
@Data
public class ScheduleItemDto {

    /**
     * 药品信息
     */
    private MedicineDto medicine;

    /**
     * 今日是否已打卡
     */
    private boolean checked;
}
