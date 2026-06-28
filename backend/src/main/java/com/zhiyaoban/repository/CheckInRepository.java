package com.zhiyaoban.repository;

import com.zhiyaoban.entity.CheckIn;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface CheckInRepository extends JpaRepository<CheckIn, Long> {
    
    /**
     * 查找用户指定日期的打卡记录，按打卡时间倒序
     */
    List<CheckIn> findByUserIdAndDateOrderByTakenAtDesc(Long userId, LocalDate date);

    /**
     * 查找用户指定日期和药品的打卡记录
     */
    Optional<CheckIn> findByUserIdAndMedicineIdAndDate(Long userId, Long medicineId, LocalDate date);

    /**
     * 检查用户指定日期和药品是否已打卡
     */
    boolean existsByUserIdAndMedicineIdAndDate(Long userId, Long medicineId, LocalDate date);

    /**
     * 查找用户在日期范围内的打卡记录
     */
    List<CheckIn> findByUserIdAndDateBetween(Long userId, LocalDate start, LocalDate end);

    /**
     * 查找用户指定日期之后的所有打卡记录
     */
    List<CheckIn> findByUserIdAndDateAfterOrderByTakenAtDesc(Long userId, LocalDate date);

    /**
     * 查找用户指定日期之前的所有打卡记录
     */
    List<CheckIn> findByUserIdAndDateBeforeOrderByTakenAtDesc(Long userId, LocalDate date);

    /**
     * 统计用户在指定日期的打卡次数
     */
    long countByUserIdAndDate(Long userId, LocalDate date);

    /**
     * 查找药品在指定日期的打卡记录
     */
    List<CheckIn> findByMedicineIdAndDate(Long medicineId, LocalDate date);

    /**
     * 查找用户在指定时间范围内的打卡记录
     */
    List<CheckIn> findByUserIdAndTakenAtBetween(Long userId, LocalDateTime start, LocalDateTime end);

    /**
     * 删除指定日期之前的打卡记录
     */
    void deleteByDateBefore(LocalDate date);
}
