package com.zhiyaoban.repository;

import com.zhiyaoban.entity.ReminderLog;
import com.zhiyaoban.entity.ReminderStatus;
import com.zhiyaoban.entity.ReminderType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReminderLogRepository extends JpaRepository<ReminderLog, Long> {
    
    /**
     * 查找用户、药品、日期和类型的提醒记录
     */
    Optional<ReminderLog> findByUserIdAndMedicineIdAndDateAndType(
        Long userId, Long medicineId, LocalDate date, ReminderType type);

    /**
     * 检查指定计划、药品、日期和类型是否已有提醒记录（用于去重）
     */
    boolean existsByScheduleIdAndMedicineIdAndDateAndType(
        Long scheduleId, Long medicineId, LocalDate date, ReminderType type);

    /**
     * 查找用户指定日期和类型的提醒记录
     */
    List<ReminderLog> findByUserIdAndDateAndType(Long userId, LocalDate date, ReminderType type);

    /**
     * 查找用户指定日期的所有提醒记录
     */
    List<ReminderLog> findByUserIdAndDateOrderByCreatedAtDesc(Long userId, LocalDate date);

    /**
     * 查找用户指定状态的提醒记录
     */
    List<ReminderLog> findByUserIdAndStatus(Long userId, ReminderStatus status);

    /**
     * 查找用户指定类型和状态的提醒记录
     */
    List<ReminderLog> findByUserIdAndTypeAndStatus(Long userId, ReminderType type, ReminderStatus status);

    /**
     * 查找用户指定类型的提醒记录
     */
    List<ReminderLog> findByUserIdAndType(Long userId, ReminderType type);

    /**
     * 查找用户的所有提醒记录
     */
    List<ReminderLog> findByUserId(Long userId);

    /**
     * 查找指定状态的提醒记录
     */
    List<ReminderLog> findByStatus(ReminderStatus status);

    /**
     * 查找待发送的提醒记录
     */
    List<ReminderLog> findByStatusOrderByCreatedAtAsc(ReminderStatus status);

    /**
     * 查找用户在日期范围内的提醒记录
     */
    List<ReminderLog> findByUserIdAndDateBetween(Long userId, LocalDate start, LocalDate end);

    /**
     * 查找指定类型的提醒记录
     */
    List<ReminderLog> findByType(ReminderType type);

    /**
     * 统计用户指定日期的提醒数量
     */
    long countByUserIdAndDate(Long userId, LocalDate date);

    /**
     * 统计指定状态的提醒数量
     */
    long countByStatus(ReminderStatus status);

    /**
     * 删除指定日期之前的提醒记录
     */
    void deleteByDateBefore(LocalDate date);

    /**
     * 查找失败的提醒记录
     */
    List<ReminderLog> findByStatusAndErrorMsgIsNotNull(ReminderStatus status);
}
