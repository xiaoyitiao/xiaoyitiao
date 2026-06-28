package com.zhiyaoban.entity;

/**
 * 提醒类型枚举
 */
public enum ReminderType {
    /**
     * 到点提醒
     */
    DUE,
    /**
     * 漏服提醒
     */
    MISSED,
    /**
     * 用药提醒（通用）
     */
    MEDICINE,
    /**
     * 库存不足提醒
     */
    STOCK
}
