package com.zhiyaoban.repository;

import com.zhiyaoban.entity.CheckIn;
import com.zhiyaoban.entity.Medicine;
import com.zhiyaoban.entity.User;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 自定义统计查询Repository
 * 处理复杂的业务统计查询
 */
public interface StatisticsRepository {

    /**
     * 获取用户在指定日期范围内的用药统计
     * @param userId 用户ID
     * @param startDate 开始日期
     * @param endDate 结束日期
     * @return 统计信息，包含应服次数、实服次数、漏服次数
     */
    Map<String, Object> getUserMedicineStatistics(Long userId, LocalDate startDate, LocalDate endDate);

    /**
     * 获取用户在指定日期的每日用药详情
     * @param userId 用户ID
     * @param date 日期
     * @return 每日用药详情列表
     */
    List<Map<String, Object>> getUserDailyMedicineDetails(Long userId, LocalDate date);

    /**
     * 获取老人绑定的家属列表
     * @param elderUserId 老人用户ID
     * @return 家属用户列表
     */
    List<User> getElderFamilyMembers(Long elderUserId);

    /**
     * 获取家属绑定的老人列表
     * @param familyUserId 家属用户ID
     * @return 老人用户列表
     */
    List<User> getFamilyElders(Long familyUserId);

    /**
     * 获取药品的库存预警列表
     * @param threshold 库存阈值
     * @return 库存不足的药品列表
     */
    List<Medicine> getLowStockMedicines(int threshold);

    /**
     * 获取用户的用药依从性统计
     * @param userId 用户ID
     * @param days 统计天数
     * @return 依从性统计信息
     */
    Map<String, Object> getUserMedicationAdherence(Long userId, int days);

    /**
     * 获取需要发送提醒的用户列表
     * @param date 日期
     * @param time 时间
     * @return 需要提醒的用户药品列表
     */
    List<Map<String, Object>> getUsersForReminding(LocalDate date, String time);

    /**
     * 获取漏服提醒列表
     * @param date 日期
     * @param minutesAfter 超过多少分钟算漏服
     * @return 漏服提醒列表
     */
    List<Map<String, Object>> getMissedMedicineReminders(LocalDate date, int minutesAfter);

    /**
     * 获取系统统计信息
     * @return 系统统计信息
     */
    Map<String, Object> getSystemStatistics();
}