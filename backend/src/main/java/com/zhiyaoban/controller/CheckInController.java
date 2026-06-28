package com.zhiyaoban.controller;

import com.zhiyaoban.dto.ApiResult;
import com.zhiyaoban.dto.CheckInDto;
import com.zhiyaoban.entity.User;
import com.zhiyaoban.service.CheckInService;
import com.zhiyaoban.repository.CheckInRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;

/**
 * 用药打卡接口
 */
@RestController
@RequestMapping("/check-ins")
@RequiredArgsConstructor
public class CheckInController {

    private final CheckInService checkInService;
    private final CheckInRepository checkInRepository;

    /**
     * 用药打卡
     */
    @PostMapping
    public ApiResult<Void> checkIn(@RequestBody @Valid CheckInDto dto, @AuthenticationPrincipal User user) {
        checkInService.checkIn(user.getId(), dto);
        return ApiResult.ok();
    }

    /**
     * 取消打卡
     */
    @DeleteMapping
    public ApiResult<Void> cancel(@RequestParam Long medicineId,
                                  @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
                                  @AuthenticationPrincipal User user) {
        checkInService.cancelCheckIn(user.getId(), medicineId, date);
        return ApiResult.ok();
    }

    /**
     * 获取指定日期的打卡记录
     */
    @GetMapping
    public ApiResult<List<CheckInDto>> list(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
                                            @AuthenticationPrincipal User user) {
        return ApiResult.ok(checkInService.listByDate(user.getId(), date));
    }

    /**
     * 获取指定月份的打卡记录
     */
    @GetMapping("/month")
    public ApiResult<List<CheckInDto>> listByMonth(@RequestParam String month,
                                                   @AuthenticationPrincipal User user) {
        YearMonth yearMonth = YearMonth.parse(month);
        return ApiResult.ok(checkInService.listByMonth(user.getId(), yearMonth));
    }

    /**
     * 获取打卡统计
     */
    @GetMapping("/statistics")
    public ApiResult<Map<String, Object>> getStatistics(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @AuthenticationPrincipal User user) {
        List<CheckInDto> checkIns = checkInService.listByDateRange(user.getId(), startDate, endDate);
        
        // 统计信息
        int totalCount = checkIns.size();
        long completedCount = checkIns.stream().filter(c -> c.getTakenAt() != null).count();
        
        return ApiResult.ok(Map.of(
            "startDate", startDate.toString(),
            "endDate", endDate.toString(),
            "totalCount", totalCount,
            "completedCount", completedCount,
            "checkIns", checkIns
        ));
    }

    /**
     * 获取今日打卡汇总
     */
    @GetMapping("/today-summary")
    public ApiResult<Map<String, Object>> getTodaySummary(@AuthenticationPrincipal User user) {
        LocalDate today = LocalDate.now();
        List<CheckInDto> checkIns = checkInService.listByDate(user.getId(), today);
        
        return ApiResult.ok(Map.of(
            "date", today.toString(),
            "totalMedicines", checkIns.size(),
            "completedCount", checkIns.stream().filter(c -> c.getTakenAt() != null).count(),
            "pendingCount", checkIns.stream().filter(c -> c.getTakenAt() == null).count(),
            "checkIns", checkIns
        ));
    }

    /**
     * 批量打卡
     */
    @PostMapping("/batch")
    public ApiResult<Void> batchCheckIn(@RequestBody Map<String, Object> request, @AuthenticationPrincipal User user) {
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> items = (List<Map<String, Object>>) request.get("items");
        if (items != null) {
            for (Map<String, Object> item : items) {
                CheckInDto dto = new CheckInDto();
                dto.setMedicineId(Long.valueOf(item.get("medicineId").toString()));
                checkInService.checkIn(user.getId(), dto);
            }
        }
        return ApiResult.ok();
    }
}
