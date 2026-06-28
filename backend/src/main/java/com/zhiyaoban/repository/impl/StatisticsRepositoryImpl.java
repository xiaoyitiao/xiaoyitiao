package com.zhiyaoban.repository.impl;

import com.zhiyaoban.entity.*;
import com.zhiyaoban.repository.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 自定义统计查询Repository实现
 */
@Repository
public class StatisticsRepositoryImpl implements StatisticsRepository {

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MedicineRepository medicineRepository;

    @Autowired
    private CheckInRepository checkInRepository;

    @Autowired
    private FamilyBindingRepository familyBindingRepository;

    @Override
    public Map<String, Object> getUserMedicineStatistics(Long userId, LocalDate startDate, LocalDate endDate) {
        Map<String, Object> statistics = new HashMap<>();

        // 获取用户的所有药品
        List<Medicine> medicines = medicineRepository.findByUserId(userId);
        int totalMedicines = medicines.size();

        // 计算日期范围内的天数
        int days = (int) (endDate.toEpochDay() - startDate.toEpochDay()) + 1;

        // 计算应服总次数（简化计算，实际需要根据频率计算）
        long expectedCount = (long) totalMedicines * days;

        // 获取实际打卡记录
        List<CheckIn> checkIns = checkInRepository.findByUserIdAndDateBetween(userId, startDate, endDate);
        long actualCount = checkIns.size();

        // 计算漏服次数
        long missedCount = expectedCount - actualCount;

        // 计算依从性
        double adherenceRate = expectedCount > 0 ? (double) actualCount / expectedCount * 100 : 0;

        statistics.put("userId", userId);
        statistics.put("startDate", startDate);
        statistics.put("endDate", endDate);
        statistics.put("totalMedicines", totalMedicines);
        statistics.put("expectedCount", expectedCount);
        statistics.put("actualCount", actualCount);
        statistics.put("missedCount", missedCount);
        statistics.put("adherenceRate", Math.round(adherenceRate * 100.0) / 100.0);

        return statistics;
    }

    @Override
    public List<Map<String, Object>> getUserDailyMedicineDetails(Long userId, LocalDate date) {
        List<Map<String, Object>> details = new ArrayList<>();

        // 获取用户的所有药品
        List<Medicine> medicines = medicineRepository.findByUserIdOrderByTimeAsc(userId);

        for (Medicine medicine : medicines) {
            Map<String, Object> detail = new HashMap<>();
            detail.put("medicineId", medicine.getId());
            detail.put("medicineName", medicine.getName());
            detail.put("time", medicine.getTime());
            detail.put("dose", medicine.getDose());
            detail.put("icon", medicine.getIcon());

            // 检查是否已打卡
            Optional<CheckIn> checkIn = checkInRepository
                .findByUserIdAndMedicineIdAndDate(userId, medicine.getId(), date);

            if (checkIn.isPresent()) {
                detail.put("taken", true);
                detail.put("takenAt", checkIn.get().getTakenAt());
                detail.put("actualDose", checkIn.get().getDose());
            } else {
                detail.put("taken", false);
                detail.put("takenAt", null);
                detail.put("actualDose", null);
            }

            details.add(detail);
        }

        return details;
    }

    @Override
    public List<User> getElderFamilyMembers(Long elderUserId) {
        List<FamilyBinding> bindings = familyBindingRepository
            .findByElderUserIdAndStatus(elderUserId, BindingStatus.ACTIVE);

        return bindings.stream()
            .map(binding -> userRepository.findById(binding.getFamilyUserId()))
            .filter(Optional::isPresent)
            .map(Optional::get)
            .collect(Collectors.toList());
    }

    @Override
    public List<User> getFamilyElders(Long familyUserId) {
        List<FamilyBinding> bindings = familyBindingRepository
            .findByFamilyUserIdAndStatus(familyUserId, BindingStatus.ACTIVE);

        return bindings.stream()
            .map(binding -> userRepository.findById(binding.getElderUserId()))
            .filter(Optional::isPresent)
            .map(Optional::get)
            .collect(Collectors.toList());
    }

    @Override
    public List<Medicine> getLowStockMedicines(int threshold) {
        // 使用原生SQL查询库存不足的药品
        String sql = "SELECT * FROM medicines WHERE stock <= :threshold";
        Query query = entityManager.createNativeQuery(sql, Medicine.class);
        query.setParameter("threshold", threshold);

        @SuppressWarnings("unchecked")
        List<Medicine> medicines = query.getResultList();
        return medicines;
    }

    @Override
    public Map<String, Object> getUserMedicationAdherence(Long userId, int days) {
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(days - 1);

        Map<String, Object> adherence = getUserMedicineStatistics(userId, startDate, endDate);

        // 添加更详细的分析
        List<CheckIn> recentCheckIns = checkInRepository
            .findByUserIdAndDateBetween(userId, startDate, endDate);

        // 按日期统计
        Map<LocalDate, Long> dailyCount = recentCheckIns.stream()
            .collect(Collectors.groupingBy(CheckIn::getDate, Collectors.counting()));

        // 计算连续打卡天数
        int consecutiveDays = calculateConsecutiveDays(userId, endDate);

        adherence.put("consecutiveDays", consecutiveDays);
        adherence.put("dailyDetails", dailyCount);

        return adherence;
    }

    @Override
    public List<Map<String, Object>> getUsersForReminding(LocalDate date, String time) {
        List<Map<String, Object>> reminders = new ArrayList<>();

        // 查找所有老人用户
        List<User> elders = userRepository.findByRole(UserRole.ELDER);

        for (User elder : elders) {
            // 获取老人的药品
            List<Medicine> medicines = medicineRepository.findByUserIdAndTime(elder.getId(), time);

            for (Medicine medicine : medicines) {
                // 检查药品是否在有效期内
                if (isMedicineValid(medicine, date)) {
                    // 检查是否已经打卡
                    Optional<CheckIn> existingCheckIn = checkInRepository
                        .findByUserIdAndMedicineIdAndDate(elder.getId(), medicine.getId(), date);

                    if (!existingCheckIn.isPresent()) {
                        Map<String, Object> reminder = new HashMap<>();
                        reminder.put("userId", elder.getId());
                        reminder.put("userName", elder.getName());
                        reminder.put("userPhone", elder.getPhone());
                        reminder.put("medicineId", medicine.getId());
                        reminder.put("medicineName", medicine.getName());
                        reminder.put("time", time);
                        reminder.put("dose", medicine.getDose());
                        reminder.put("date", date);

                        reminders.add(reminder);
                    }
                }
            }
        }

        return reminders;
    }

    @Override
    public List<Map<String, Object>> getMissedMedicineReminders(LocalDate date, int minutesAfter) {
        List<Map<String, Object>> missedReminders = new ArrayList<>();
        LocalTime thresholdTime = LocalTime.now().minusMinutes(minutesAfter);

        // 查找所有老人用户
        List<User> elders = userRepository.findByRole(UserRole.ELDER);

        for (User elder : elders) {
            // 获取老人的所有药品
            List<Medicine> medicines = medicineRepository.findByUserId(elder.getId());

            for (Medicine medicine : medicines) {
                // 解析药品时间
                LocalTime medicineTime = LocalTime.parse(medicine.getTime());

                // 检查是否超过阈值时间且未打卡
                if (medicineTime.isBefore(thresholdTime)) {
                    Optional<CheckIn> existingCheckIn = checkInRepository
                        .findByUserIdAndMedicineIdAndDate(elder.getId(), medicine.getId(), date);

                    if (!existingCheckIn.isPresent()) {
                        Map<String, Object> reminder = new HashMap<>();
                        reminder.put("userId", elder.getId());
                        reminder.put("userName", elder.getName());
                        reminder.put("userPhone", elder.getPhone());
                        reminder.put("medicineId", medicine.getId());
                        reminder.put("medicineName", medicine.getName());
                        reminder.put("scheduledTime", medicineTime);
                        reminder.put("date", date);
                        reminder.put("missedMinutes", minutesAfter);

                        missedReminders.add(reminder);
                    }
                }
            }
        }

        return missedReminders;
    }

    @Override
    public Map<String, Object> getSystemStatistics() {
        Map<String, Object> stats = new HashMap<>();

        // 用户统计
        long totalUsers = userRepository.count();
        long elderCount = userRepository.findByRole(UserRole.ELDER).size();
        long familyCount = userRepository.findByRole(UserRole.FAMILY).size();
        long adminCount = userRepository.findByRole(UserRole.ADMIN).size();

        // 药品统计
        long totalMedicines = medicineRepository.count();
        long lowStockCount = getLowStockMedicines(10).size();

        // 打卡统计
        LocalDate today = LocalDate.now();
        long todayCheckIns = checkInRepository.countByUserIdAndDate(null, today); // 需要修正

        // 绑定关系统计
        long activeBindings = familyBindingRepository.countByStatus(BindingStatus.ACTIVE);
        long pendingBindings = familyBindingRepository.countByStatus(BindingStatus.PENDING);

        // 提醒统计
        long pendingReminders = 0; // 需要从ReminderLogRepository获取

        stats.put("users", Map.of(
            "total", totalUsers,
            "elders", elderCount,
            "families", familyCount,
            "admins", adminCount
        ));

        stats.put("medicines", Map.of(
            "total", totalMedicines,
            "lowStock", lowStockCount
        ));

        stats.put("bindings", Map.of(
            "active", activeBindings,
            "pending", pendingBindings
        ));

        stats.put("today", Map.of(
            "date", today,
            "checkIns", todayCheckIns
        ));

        return stats;
    }

    // 辅助方法：检查药品是否在有效期内
    private boolean isMedicineValid(Medicine medicine, LocalDate date) {
        if (medicine.getStartDate() != null && date.isBefore(medicine.getStartDate())) {
            return false;
        }
        if (medicine.getEndDate() != null && date.isAfter(medicine.getEndDate())) {
            return false;
        }
        return true;
    }

    // 辅助方法：计算连续打卡天数
    private int calculateConsecutiveDays(Long userId, LocalDate endDate) {
        int consecutiveDays = 0;
        LocalDate currentDate = endDate;

        while (consecutiveDays < 365) { // 最多计算365天
            long count = checkInRepository.countByUserIdAndDate(userId, currentDate);
            if (count > 0) {
                consecutiveDays++;
                currentDate = currentDate.minusDays(1);
            } else {
                break;
            }
        }

        return consecutiveDays;
    }
}