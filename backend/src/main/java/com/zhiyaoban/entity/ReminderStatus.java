package com.zhiyaoban.entity;

/**
 * 提醒发送状态枚举
 */
public enum ReminderStatus {
    /**
     * 待发送
     */
    PENDING,
    /**
     * 已发送
     */
    SENT,
    /**
     * 发送成功
     */
    SUCCESS,
    /**
     * 发送失败
     */
    FAILED
}
