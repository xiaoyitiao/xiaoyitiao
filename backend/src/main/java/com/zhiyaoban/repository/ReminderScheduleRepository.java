package com.zhiyaoban.repository;

import com.zhiyaoban.entity.ReminderSchedule;
import com.zhiyaoban.entity.ReminderType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/**
 * 提醒计划Repository
 */
@Repository
public interface ReminderScheduleRepository extends JpaRepository<ReminderSchedule, Long> {

    /**
     * 查询用户所有提醒计划
     */
    List<ReminderSchedule> findByUserId(Long userId);

    /**
     * 查询用户启用的提醒计划
     */
    List<ReminderSchedule> findByUserIdAndEnabledTrue(Long userId);

    /**
     * 查询指定类型和启用的提醒计划
     */
    List<ReminderSchedule> findByTypeAndEnabledTrue(ReminderType type);

    /**
     * 查询用户在有效期内的启用计划
     */
    @Query("SELECT rs FROM ReminderSchedule rs " +
           "WHERE rs.userId = :userId " +
           "AND rs.enabled = true " +
           "AND (rs.startDate IS NULL OR rs.startDate <= :date) " +
           "AND (rs.endDate IS NULL OR rs.endDate >= :date)")
    List<ReminderSchedule> findValidSchedulesForUser(
        @Param("userId") Long userId,
        @Param("date") LocalDate date
    );

    /**
     * 查询指定时间点需要发送的提醒计划
     */
    @Query("SELECT rs FROM ReminderSchedule rs " +
           "WHERE rs.enabled = true " +
           "AND rs.type = :type " +
           "AND (rs.startDate IS NULL OR rs.startDate <= :date) " +
           "AND (rs.endDate IS NULL OR rs.endDate >= :date) " +
           "AND rs.quietHoursStart IS NULL " +
           "ORDER BY rs.userId")
    List<ReminderSchedule> findSchedulesToSendAt(
        @Param("type") ReminderType type,
        @Param("date") LocalDate date
    );

    /**
     * 查询非免打扰时段的提醒计划
     */
    @Query("SELECT rs FROM ReminderSchedule rs " +
           "WHERE rs.enabled = true " +
           "AND rs.type = :type " +
           "AND (rs.startDate IS NULL OR rs.startDate <= :date) " +
           "AND (rs.endDate IS NULL OR rs.endDate >= :date) " +
           "AND (rs.quietHoursStart IS NULL " +
           "     OR rs.quietHoursEnd IS NULL " +
           "     OR (:time < rs.quietHoursStart OR :time >= rs.quietHoursEnd))")
    List<ReminderSchedule> findSchedulesNotInQuietHours(
        @Param("type") ReminderType type,
        @Param("date") LocalDate date,
        @Param("time") LocalTime time
    );
}
