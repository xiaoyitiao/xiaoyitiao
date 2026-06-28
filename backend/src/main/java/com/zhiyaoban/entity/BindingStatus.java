package com.zhiyaoban.entity;

/**
 * 家人绑定状态枚举
 */
public enum BindingStatus {
    /**
     * 待确认
     */
    PENDING,
    /**
     * 已同意
     */
    ACCEPTED,
    /**
     * 已拒绝
     */
    REJECTED,
    /**
     * 已激活
     */
    ACTIVE,
    /**
     * 已停用
     */
    INACTIVE
}
