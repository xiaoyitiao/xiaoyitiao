package com.zhiyaoban.repository;

import com.zhiyaoban.entity.MedicineReminder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalTime;
import java.util.List;

/**
 * 药品提醒关联Repository
 */
@Repository
public interface MedicineReminderRepository extends JpaRepository<MedicineReminder, Long> {

    /**
     * 查询提醒计划下的所有药品提醒
     */
    List<MedicineReminder> findByScheduleId(Long scheduleId);

    /**
     * 查询提醒计划下启用的药品提醒
     */
    List<MedicineReminder> findByScheduleIdAndEnabledTrue(Long scheduleId);

    /**
     * 查询指定药品的所有提醒设置
     */
    List<MedicineReminder> findByMedicineIdAndEnabledTrue(Long medicineId);

    /**
     * 查询指定时间的药品提醒
     */
    @Query("SELECT mr FROM MedicineReminder mr " +
           "JOIN mr.schedule s " +
           "WHERE mr.medicineId = :medicineId " +
           "AND mr.enabled = true " +
           "AND s.enabled = true " +
           "AND mr.remindTime = :time")
    List<MedicineReminder> findByMedicineIdAndRemindTime(
        @Param("medicineId") Long medicineId,
        @Param("time") LocalTime time
    );

    /**
     * 查询指定时间范围内的药品提醒
     */
    @Query("SELECT mr FROM MedicineReminder mr " +
           "JOIN mr.schedule s " +
           "WHERE mr.enabled = true " +
           "AND s.enabled = true " +
           "AND mr.remindTime BETWEEN :startTime AND :endTime")
    List<MedicineReminder> findByRemindTimeRange(
        @Param("startTime") LocalTime startTime,
        @Param("endTime") LocalTime endTime
    );

    /**
     * 删除指定提醒计划的所有关联
     */
    void deleteByScheduleId(Long scheduleId);

    /**
     * 删除指定药品的所有关联
     */
    void deleteByMedicineId(Long medicineId);

    /**
     * 查询所有启用的提醒，按提醒时间排序
     */
    @Query("SELECT mr FROM MedicineReminder mr " +
           "JOIN mr.schedule s " +
           "WHERE mr.enabled = true " +
           "AND s.enabled = true " +
           "ORDER BY mr.remindTime")
    List<MedicineReminder> findAllEnabledOrderByTime();
}
