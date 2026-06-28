package com.zhiyaoban.controller;

import com.zhiyaoban.dto.ApiResult;
import com.zhiyaoban.dto.CheckInDto;
import com.zhiyaoban.dto.MedicineDto;
import com.zhiyaoban.entity.User;
import com.zhiyaoban.service.CheckInService;
import com.zhiyaoban.service.MedicineService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 今日用药计划接口
 */
@RestController
@RequestMapping("/schedule")
@RequiredArgsConstructor
public class ScheduleController {

    private final MedicineService medicineService;
    private final CheckInService checkInService;

    /**
     * 获取指定日期的用药计划
     */
    @GetMapping("/today")
    public ApiResult<Map<String, Object>> today(@AuthenticationPrincipal User user,
                                                 @RequestParam(required = false)
                                                 @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        if (date == null) {
            date = LocalDate.now();
        }
        List<MedicineDto> medicines = medicineService.listByUser(user.getId());
        List<CheckInDto> checkIns = checkInService.listByDate(user.getId(), date);

        Map<String, Object> result = new HashMap<>();
        result.put("date", date.toString());
        result.put("medicines", medicines);
        result.put("checkIns", checkIns);
        
        // 计算完成进度
        int totalCount = medicines.size();
        int completedCount = (int) checkIns.stream().filter(c -> c.getTakenAt() != null).count();
        result.put("totalCount", totalCount);
        result.put("completedCount", completedCount);
        result.put("pendingCount", totalCount - completedCount);
        result.put("completionRate", totalCount > 0 ? Math.round((double) completedCount / totalCount * 100) : 0);
        
        return ApiResult.ok(result);
    }

    /**
     * 获取本周的用药计划
     */
    @GetMapping("/week")
    public ApiResult<Map<String, Object>> week(@AuthenticationPrincipal User user,
                                                 @RequestParam(required = false)
                                                 @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate) {
        if (startDate == null) {
            startDate = LocalDate.now().minusDays(LocalDate.now().getDayOfWeek().getValue() - 1);
        }
        LocalDate endDate = startDate.plusDays(6);
        
        List<MedicineDto> medicines = medicineService.listByUser(user.getId());
        
        Map<String, Object> result = new HashMap<>();
        result.put("startDate", startDate.toString());
        result.put("endDate", endDate.toString());
        result.put("medicines", medicines);
        
        // 按日期分组
        Map<String, Map<String, Object>> dailyData = new HashMap<>();
        for (int i = 0; i < 7; i++) {
            LocalDate date = startDate.plusDays(i);
            List<CheckInDto> checkIns = checkInService.listByDate(user.getId(), date);
            
            Map<String, Object> dayInfo = new HashMap<>();
            dayInfo.put("date", date.toString());
            dayInfo.put("dayOfWeek", date.getDayOfWeek().toString());
            dayInfo.put("totalCount", medicines.size());
            dayInfo.put("completedCount", (int) checkIns.stream().filter(c -> c.getTakenAt() != null).count());
            dayInfo.put("checkIns", checkIns);
            
            dailyData.put(date.toString(), dayInfo);
        }
        result.put("dailyData", dailyData);
        
        return ApiResult.ok(result);
    }

    /**
     * 获取指定日期范围内的用药计划
     */
    @GetMapping("/range")
    public ApiResult<Map<String, Object>> range(@AuthenticationPrincipal User user,
                                                 @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
                                                 @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        List<MedicineDto> medicines = medicineService.listByUser(user.getId());
        
        Map<String, Object> result = new HashMap<>();
        result.put("startDate", startDate.toString());
        result.put("endDate", endDate.toString());
        result.put("medicines", medicines);
        
        // 按日期统计
        Map<String, Integer> dailyStats = new HashMap<>();
        LocalDate current = startDate;
        while (!current.isAfter(endDate)) {
            List<CheckInDto> checkIns = checkInService.listByDate(user.getId(), current);
            dailyStats.put(current.toString(), (int) checkIns.stream().filter(c -> c.getTakenAt() != null).count());
            current = current.plusDays(1);
        }
        result.put("dailyStats", dailyStats);
        
        return ApiResult.ok(result);
    }
}
