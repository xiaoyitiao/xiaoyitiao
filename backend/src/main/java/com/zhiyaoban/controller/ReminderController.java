package com.zhiyaoban.controller;

import com.zhiyaoban.dto.ApiResult;
import com.zhiyaoban.dto.PushSubscriptionDto;
import com.zhiyaoban.dto.ReminderLogDto;
import com.zhiyaoban.dto.ReminderScheduleDto;
import com.zhiyaoban.entity.User;
import com.zhiyaoban.repository.PushSubscriptionRepository;
import com.zhiyaoban.service.PushService;
import com.zhiyaoban.service.ReminderScheduleService;
import com.zhiyaoban.service.ReminderScheduler;
import com.zhiyaoban.service.ReminderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 提醒订阅接口
 */
@RestController
@RequestMapping("/reminders")
@RequiredArgsConstructor
public class ReminderController {

    private final PushService pushService;
    private final PushSubscriptionRepository pushSubscriptionRepository;
    private final ReminderScheduleService reminderScheduleService;
    private final ReminderScheduler reminderScheduler;
    private final ReminderService reminderService;

    // ==================== 提醒计划接口 ====================

    /**
     * 获取用户的提醒计划列表
     */
    @GetMapping("/schedules")
    public ApiResult<List<ReminderScheduleDto>> getSchedules(@AuthenticationPrincipal User user) {
        return ApiResult.ok(reminderScheduleService.getSchedulesByUser(user.getId()));
    }

    /**
     * 获取提醒日志
     */
    @GetMapping("/logs")
    public ApiResult<List<ReminderLogDto>> getLogs(
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status) {
        return ApiResult.ok(reminderService.getLogs(userId, type, status));
    }

    /**
     * 获取启用的提醒计划列表
     */
    @GetMapping("/schedules/enabled")
    public ApiResult<List<ReminderScheduleDto>> getEnabledSchedules(@AuthenticationPrincipal User user) {
        return ApiResult.ok(reminderScheduleService.getEnabledSchedulesByUser(user.getId()));
    }

    /**
     * 获取提醒计划详情
     */
    @GetMapping("/schedules/{id}")
    public ApiResult<ReminderScheduleDto> getSchedule(@PathVariable Long id, @AuthenticationPrincipal User user) {
        return ApiResult.ok(reminderScheduleService.getSchedule(id, user.getId()));
    }

    /**
     * 创建提醒计划
     */
    @PostMapping("/schedules")
    public ApiResult<ReminderScheduleDto> createSchedule(
            @RequestBody @Valid ReminderScheduleDto dto,
            @AuthenticationPrincipal User user) {
        ReminderScheduleDto result = reminderScheduleService.createSchedule(user.getId(), dto);
        return ApiResult.ok(result);
    }

    /**
     * 更新提醒计划
     */
    @PutMapping("/schedules/{id}")
    public ApiResult<ReminderScheduleDto> updateSchedule(
            @PathVariable Long id,
            @RequestBody ReminderScheduleDto dto,
            @AuthenticationPrincipal User user) {
        ReminderScheduleDto result = reminderScheduleService.updateSchedule(id, user.getId(), dto);
        return ApiResult.ok(result);
    }

    /**
     * 删除提醒计划
     */
    @DeleteMapping("/schedules/{id}")
    public ApiResult<Void> deleteSchedule(@PathVariable Long id, @AuthenticationPrincipal User user) {
        reminderScheduleService.deleteSchedule(id, user.getId());
        return ApiResult.ok();
    }

    /**
     * 启用/禁用提醒计划
     */
    @PatchMapping("/schedules/{id}/enabled")
    public ApiResult<Void> setScheduleEnabled(
            @PathVariable Long id,
            @RequestParam boolean enabled,
            @AuthenticationPrincipal User user) {
        reminderScheduleService.setScheduleEnabled(id, user.getId(), enabled);
        return ApiResult.ok();
    }

    /**
     * 手动触发提醒（测试用）
     */
    @PostMapping("/schedules/{scheduleId}/trigger")
    public ApiResult<Void> triggerReminder(
            @PathVariable Long scheduleId,
            @RequestParam Long medicineId) {
        reminderScheduler.triggerReminder(scheduleId, medicineId);
        return ApiResult.ok();
    }

    // ==================== 订阅推送接口 ====================

    /**
     * 订阅推送通知
     */
    @PostMapping("/subscribe")
    public ApiResult<Void> subscribe(@RequestBody @Valid PushSubscriptionDto dto, @AuthenticationPrincipal User user) {
        pushService.saveSubscription(user.getId(), dto);
        return ApiResult.ok();
    }

    /**
     * 取消订阅
     */
    @DeleteMapping("/unsubscribe")
    public ApiResult<Void> unsubscribe(@RequestBody Map<String, String> request, @AuthenticationPrincipal User user) {
        String endpoint = request.get("endpoint");
        if (endpoint != null) {
            pushSubscriptionRepository.deleteByEndpoint(endpoint);
        }
        return ApiResult.ok();
    }

    /**
     * 获取订阅列表
     */
    @GetMapping("/subscriptions")
    public ApiResult<List<PushSubscriptionDto>> getSubscriptions(@AuthenticationPrincipal User user) {
        var subscriptions = pushService.listByUser(user.getId());
        return ApiResult.ok(subscriptions.stream().map(sub -> {
            PushSubscriptionDto dto = new PushSubscriptionDto();
            dto.setEndpoint(sub.getEndpoint());
            dto.setP256dh(sub.getP256dh());
            dto.setAuth(sub.getAuth());
            return dto;
        }).toList());
    }

    /**
     * 测试推送
     */
    @PostMapping("/test-push")
    public ApiResult<String> testPush(@AuthenticationPrincipal User user) {
        boolean sent = pushService.sendPush(user.getId(), "智药伴测试", "这是一条测试推送");
        return sent ? ApiResult.ok("已发送") : ApiResult.error("无有效订阅");
    }

    /**
     * 获取订阅状态
     */
    @GetMapping("/status")
    public ApiResult<Map<String, Object>> getStatus(@AuthenticationPrincipal User user) {
        long count = pushSubscriptionRepository.countByUserId(user.getId());
        boolean hasSubscription = count > 0;
        return ApiResult.ok(Map.of(
            "hasSubscription", hasSubscription,
            "subscriptionCount", count
        ));
    }
}
