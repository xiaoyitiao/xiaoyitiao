package com.zhiyaoban.repository;

import com.zhiyaoban.entity.Medicine;
import com.zhiyaoban.entity.MedicineFrequency;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface MedicineRepository extends JpaRepository<Medicine, Long> {
    
    /**
     * 查找用户的所有药品，按时间排序
     */
    List<Medicine> findByUserIdOrderByTimeAsc(Long userId);

    /**
     * 查找用户的所有药品
     */
    List<Medicine> findByUserId(Long userId);

    /**
     * 根据用户ID和药品名称查找
     */
    List<Medicine> findByUserIdAndNameContainingIgnoreCase(Long userId, String name);

    /**
     * 根据用户ID和频率查找
     */
    List<Medicine> findByUserIdAndFrequency(Long userId, MedicineFrequency frequency);

    /**
     * 查找库存不足的药品
     */
    List<Medicine> findByUserIdAndStockLessThanEqual(Long userId, Integer stock);

    /**
     * 查找指定日期范围内有效的药品
     */
    List<Medicine> findByUserIdAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
        Long userId, LocalDate startDate, LocalDate endDate);

    /**
     * 查找没有结束日期或结束日期未到的药品
     */
    List<Medicine> findByUserIdAndEndDateIsNullOrEndDateAfter(Long userId, LocalDate date);

    /**
     * 根据用户ID和时间查找药品
     */
    List<Medicine> findByUserIdAndTime(Long userId, String time);
}
