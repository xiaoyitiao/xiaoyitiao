package com.zhiyaoban.dto;

import lombok.Data;

import java.time.LocalDate;
import java.util.List;

/**
 * 家人查看老人今日用药状态
 */
@Data
public class FamilyElderTodayDto {

    /**
     * 老人手机号
     */
    private String elderPhone;

    /**
     * 老人姓名
     */
    private String elderName;

    /**
     * 查询日期
     */
    private LocalDate date;

    /**
     * 今日用药计划列表
     */
    private List<ScheduleItemDto> schedule;
}
