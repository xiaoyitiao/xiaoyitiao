package com.zhiyaoban.service;

import com.zhiyaoban.config.SchedulerConfig;
import com.zhiyaoban.config.SmsConfig;
import com.zhiyaoban.entity.*;
import com.zhiyaoban.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 提醒调度服务
 * 负责定时扫描需要发送的提醒并触发发送
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReminderScheduler {

    private final ReminderScheduleRepository reminderScheduleRepository;
    private final MedicineReminderRepository medicineReminderRepository;
    private final MedicineRepository medicineRepository;
    private final CheckInRepository checkInRepository;
    private final ReminderLogRepository reminderLogRepository;
    private final PushService pushService;
    private final AliyunSmsService aliyunSmsService;
    private final FamilyBindingRepository familyBindingRepository;
    private final SchedulerConfig schedulerConfig;
    private final UserRepository userRepository;
    private final SmsConfig smsConfig;

    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm");

    /**
     * 每分钟执行一次，扫描需要发送的用药提醒
     */
    @Scheduled(cron = "0 * * * * *")
    @Transactional
    public void checkAndSendReminders() {
        if (!schedulerConfig.isEnabled()) {
            log.debug("调度器已禁用，跳过提醒检查");
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDate today = now.toLocalDate();
        LocalTime currentTime = now.toLocalTime();
        int currentMinute = currentTime.getHour() * 60 + currentTime.getMinute();

        log.debug("开始检查提醒任务，当前时间: {}", now);

        // 获取所有启用的提醒计划
        List<ReminderSchedule> schedules = reminderScheduleRepository.findByTypeAndEnabledTrue(ReminderType.MEDICINE);

        // 兼容旧数据：将 daily 频率的药品自动纳入默认用药提醒计划（若前端未创建提醒计划）
        List<Medicine> allMedicines = medicineRepository.findAll();
        for (Medicine medicine : allMedicines) {
            if (medicine.getTime() == null) continue;
            boolean hasSchedule = schedules.stream().anyMatch(s -> s.getUserId().equals(medicine.getUserId()));
            if (!hasSchedule && MedicineFrequency.DAILY.name().equalsIgnoreCase(medicine.getFrequency().name())) {
                log.debug("用户 {} 没有用药提醒计划，跳过药品 {} 的提醒调度", medicine.getUserId(), medicine.getId());
            }
        }

        for (ReminderSchedule schedule : schedules) {
            try {
                processSchedule(schedule, today, currentTime, currentMinute);
            } catch (Exception e) {
                log.error("处理提醒计划 {} 失败: {}", schedule.getId(), e.getMessage(), e);
            }
        }

        // 检查漏服提醒
        checkMissedReminders(today);

        // 检查库存不足提醒
        checkLowStockReminders(today);
    }

    /**
     * 处理单个提醒计划
     */
    private void processSchedule(ReminderSchedule schedule, LocalDate today, LocalTime currentTime, int currentMinute) {
        // 检查日期是否有效
        if (!schedule.isValidForDate(today)) {
            return;
        }

        // 检查星期是否有效
        if (!schedule.isValidForDayOfWeek(today.getDayOfWeek().getValue())) {
            return;
        }

        // 检查是否在免打扰时间内
        if (schedule.isInQuietHours(currentTime)) {
            log.debug("计划 {} 在免打扰时间内，跳过", schedule.getId());
            return;
        }

        // 获取该计划下的药品提醒
        List<MedicineReminder> medicineReminders = medicineReminderRepository.findByScheduleIdAndEnabledTrue(schedule.getId());

        for (MedicineReminder mr : medicineReminders) {
            LocalTime remindTime = mr.getRemindTime();
            int remindMinute = remindTime.getHour() * 60 + remindTime.getMinute();

            // 考虑提前提醒
            int effectiveMinute = remindMinute - schedule.getAdvanceMinutes();
            if (effectiveMinute < 0) {
                effectiveMinute += 24 * 60;
            }

            // 检查是否到了提醒时间（±1分钟容差）
            if (Math.abs(currentMinute - effectiveMinute) <= 1) {
                // 检查是否已经打过卡
                boolean alreadyCheckedIn = checkInRepository.existsByUserIdAndMedicineIdAndDate(
                    schedule.getUserId(), mr.getMedicineId(), today);

                if (!alreadyCheckedIn) {
                    sendReminder(schedule, mr, today, currentTime);
                } else {
                    log.debug("用户 {} 药品 {} 已在时间 {} 打卡，跳过提醒",
                        schedule.getUserId(), mr.getMedicineId(), remindTime);
                }
            }
        }
    }

    /**
     * 发送提醒
     */
    private void sendReminder(ReminderSchedule schedule, MedicineReminder mr, LocalDate date, LocalTime time) {
        Medicine medicine = medicineRepository.findById(mr.getMedicineId()).orElse(null);
        if (medicine == null) {
            log.warn("药品 {} 不存在，跳过提醒", mr.getMedicineId());
            return;
        }

        String title = "用药提醒";
        String content = String.format("您需要在 %s 服用 %s %s",
            mr.getRemindTime().format(TIME_FORMAT),
            medicine.getName(),
            mr.getDose() != null ? mr.getDose() : medicine.getDose());

        // 创建提醒日志
        ReminderLog logEntry = new ReminderLog();
        logEntry.setUserId(schedule.getUserId());
        logEntry.setMedicineId(mr.getMedicineId());
        logEntry.setScheduleId(schedule.getId());
        logEntry.setDate(date);
        logEntry.setType(schedule.getType());
        logEntry.setChannel(schedule.getChannel());
        logEntry.setTitle(title);
        logEntry.setContent(content);
        logEntry.setStatus(ReminderStatus.PENDING);
        logEntry.setSentAt(LocalDateTime.now());
        reminderLogRepository.save(logEntry);

        // 根据渠道发送
        boolean success = false;
        switch (schedule.getChannel()) {
            case PUSH:
                success = pushService.sendPush(schedule.getUserId(), title, content);
                break;
            case SMS:
                // 阿里云短信发送
                success = sendSmsReminder(schedule.getUserId(), content);
                break;
            case CALL:
                // 电话提醒需接入语音服务（如阿里云语音通知）
                log.warn("电话提醒功能暂未实现，用户: {}", schedule.getUserId());
                success = false;
                break;
            case IN_APP:
                // 应用内通知，通过WebSocket或其他方式
                success = true;
                break;
        }

        // 更新发送状态
        logEntry.setStatus(success ? ReminderStatus.SUCCESS : ReminderStatus.FAILED);
        if (!success) {
            logEntry.setErrorMsg("发送失败");
        }
        reminderLogRepository.save(logEntry);

        // 如果设置了重复提醒，处理重复
        if (success && schedule.getRepeatCount() > 1) {
            scheduleReminderRetries(schedule, mr, date, title, content);
        }
    }

    /**
     * 处理重复提醒
     */
    private void scheduleReminderRetries(ReminderSchedule schedule, MedicineReminder mr, LocalDate date,
                                          String title, String content) {
        // 重复提醒通过调度器自动处理，这里记录重试次数
        // 实际重试逻辑在 checkAndSendReminders 中根据 retry_count 处理
        for (int i = 1; i < schedule.getRepeatCount(); i++) {
            ReminderLog retryLog = new ReminderLog();
            retryLog.setUserId(schedule.getUserId());
            retryLog.setMedicineId(mr.getMedicineId());
            retryLog.setScheduleId(schedule.getId());
            retryLog.setDate(date);
            retryLog.setType(schedule.getType());
            retryLog.setChannel(schedule.getChannel());
            retryLog.setTitle(title + " (第" + (i + 1) + "次)");
            retryLog.setContent(content);
            retryLog.setStatus(ReminderStatus.PENDING);
            retryLog.setRetryCount(i);
            reminderLogRepository.save(retryLog);
        }
    }

    /**
     * 检查漏服提醒
     * 针对已经过了提醒时间但还未打卡的用户
     */
    private void checkMissedReminders(LocalDate today) {
        LocalTime now = LocalTime.now();

        // 获取所有启用的漏服提醒计划
        List<ReminderSchedule> missedSchedules = reminderScheduleRepository.findByTypeAndEnabledTrue(ReminderType.MISSED);

        for (ReminderSchedule schedule : missedSchedules) {
            if (!schedule.isValidForDate(today) || !schedule.isValidForDayOfWeek(today.getDayOfWeek().getValue())) {
                continue;
            }

            List<MedicineReminder> medicineReminders = medicineReminderRepository.findByScheduleIdAndEnabledTrue(schedule.getId());

            for (MedicineReminder mr : medicineReminders) {
                // 过了提醒时间后发送漏服提醒（延迟时间可配置）
                LocalTime missedTime = mr.getRemindTime().plusMinutes(schedulerConfig.getMissedDelayMinutes());
                if (now.isAfter(missedTime)) {
                    boolean alreadyCheckedIn = checkInRepository.existsByUserIdAndMedicineIdAndDate(
                        schedule.getUserId(), mr.getMedicineId(), today);

                    if (!alreadyCheckedIn) {
                        sendMissedReminder(schedule, mr, today);
                    }
                }
            }
        }
    }

    /**
     * 发送漏服提醒
     */
    private void sendMissedReminder(ReminderSchedule schedule, MedicineReminder mr, LocalDate date) {
        Medicine medicine = medicineRepository.findById(mr.getMedicineId()).orElse(null);
        if (medicine == null) {
            return;
        }

        String title = "漏服提醒";
        String content = String.format("您今天 %s 的 %s %s 还未服用，请尽快补服。",
            mr.getRemindTime().format(TIME_FORMAT),
            medicine.getName(),
            mr.getDose() != null ? mr.getDose() : medicine.getDose());

        // 创建提醒日志
        ReminderLog logEntry = new ReminderLog();
        logEntry.setUserId(schedule.getUserId());
        logEntry.setMedicineId(mr.getMedicineId());
        logEntry.setScheduleId(schedule.getId());
        logEntry.setDate(date);
        logEntry.setType(ReminderType.MISSED);
        logEntry.setChannel(schedule.getChannel());
        logEntry.setTitle(title);
        logEntry.setContent(content);
        logEntry.setStatus(ReminderStatus.PENDING);
        logEntry.setSentAt(LocalDateTime.now());
        reminderLogRepository.save(logEntry);

        // 发送通知
        boolean success = pushService.sendPush(schedule.getUserId(), title, content);
        logEntry.setStatus(success ? ReminderStatus.SUCCESS : ReminderStatus.FAILED);
        if (!success) {
            logEntry.setErrorMsg("发送失败");
        }
        reminderLogRepository.save(logEntry);

        // 通知家属
        notifyFamilyForMissed(schedule.getUserId(), title, content);
    }

    /**
     * 检查库存不足提醒
     */
    private void checkLowStockReminders(LocalDate today) {
        log.info("========== checkLowStockReminders 开始 ==========");
        log.info("检查日期: {}", today);

        List<ReminderSchedule> stockSchedules = reminderScheduleRepository.findByTypeAndEnabledTrue(ReminderType.STOCK);
        log.info("找到 {} 个启用的库存提醒计划", stockSchedules.size());

        for (ReminderSchedule schedule : stockSchedules) {
            log.info("┌─────────────────────────────────────────────┐");
            log.info("│ 处理库存提醒计划: id={}, name={}", schedule.getId(), schedule.getName());
            log.info("└─────────────────────────────────────────────┘");

            if (!schedule.isValidForDate(today)) {
                log.info("⏭️ 计划日期不匹配，跳过");
                continue;
            }

            List<MedicineReminder> medicineReminders = medicineReminderRepository.findByScheduleIdAndEnabledTrue(schedule.getId());
            log.info("计划关联了 {} 个药品提醒", medicineReminders.size());

            for (MedicineReminder mr : medicineReminders) {
                Medicine medicine = medicineRepository.findById(mr.getMedicineId()).orElse(null);
                
                if (medicine == null) {
                    log.warn("❌ 药品 {} 不存在，跳过", mr.getMedicineId());
                    continue;
                }

                log.info("检查药品: id={}, name={}, stock={}", 
                    medicine.getId(), medicine.getName(), medicine.getStock());

                if (!medicine.getUserId().equals(schedule.getUserId())) {
                    log.warn("❌ 用户ID不匹配，跳过");
                    continue;
                }

                int threshold = schedulerConfig.getStockThreshold();
                if (medicine.getStock() <= threshold) {
                    log.info("⚠️ 库存不足检测: stock={} <= threshold={}", medicine.getStock(), threshold);

                    boolean alreadyReminded = reminderLogRepository.existsByScheduleIdAndMedicineIdAndDateAndType(
                        schedule.getId(), medicine.getId(), today, ReminderType.STOCK);
                    
                    log.info("去重检查结果: alreadyReminded={}", alreadyReminded);

                    if (!alreadyReminded) {
                        log.info("✓✓✓ 未发送过，调用 sendLowStockReminder");
                        sendLowStockReminder(schedule, medicine, today);
                    } else {
                        log.info("✅ 今日已发送过，跳过（去重逻辑生效）");
                    }
                } else {
                    log.info("✅ 库存充足: stock={} > threshold={}", medicine.getStock(), threshold);
                }
            }
        }

        log.info("========== checkLowStockReminders 结束 ==========");
    }

    /**
     * 发送库存不足提醒
     */
    private void sendLowStockReminder(ReminderSchedule schedule, Medicine medicine, LocalDate date) {
        log.info("┌─────────────────────────────────────────────┐");
        log.info("│        sendLowStockReminder 开始            │");
        log.info("└─────────────────────────────────────────────┘");

        String title = "库存不足提醒";
        String content = String.format("您的 %s 库存仅剩 %d 盒，请及时补充。", medicine.getName(), medicine.getStock());

        log.info("提醒信息:");
        log.info("  - userId: {}", schedule.getUserId());
        log.info("  - medicineId: {}", medicine.getId());
        log.info("  - medicineName: {}", medicine.getName());
        log.info("  - stock: {}", medicine.getStock());
        log.info("  - title: {}", title);
        log.info("  - content: {}", content);

        ReminderLog logEntry = new ReminderLog();
        logEntry.setUserId(schedule.getUserId());
        logEntry.setMedicineId(medicine.getId());
        logEntry.setScheduleId(schedule.getId());
        logEntry.setDate(date);
        logEntry.setType(ReminderType.STOCK);
        logEntry.setChannel(schedule.getChannel());
        logEntry.setTitle(title);
        logEntry.setContent(content);
        logEntry.setStatus(ReminderStatus.PENDING);
        logEntry.setSentAt(LocalDateTime.now());
        
        log.info("✓ 创建提醒日志，状态: PENDING");
        reminderLogRepository.save(logEntry);

        log.info("📤 调用 pushService.sendPush(userId={}, title={})", schedule.getUserId(), title);
        boolean success = pushService.sendPush(schedule.getUserId(), title, content);
        log.info("📥 推送结果: success={}", success);

        logEntry.setStatus(success ? ReminderStatus.SUCCESS : ReminderStatus.FAILED);
        if (!success) {
            logEntry.setErrorMsg("发送失败");
            log.warn("❌ 推送失败，更新日志状态为 FAILED");
        } else {
            log.info("✓ 推送成功，更新日志状态为 SUCCESS");
        }
        reminderLogRepository.save(logEntry);

        log.info("👨‍👩‍👧 通知家属（如有）");
        notifyFamilyForLowStock(schedule.getUserId(), medicine);

        log.info("┌─────────────────────────────────────────────┐");
        log.info("│        sendLowStockReminder 结束            │");
        log.info("└─────────────────────────────────────────────┘");
    }

    /**
     * 漏服时通知家属
     */
    private void notifyFamilyForMissed(Long elderUserId, String title, String content) {
        List<FamilyBinding> bindings = familyBindingRepository.findByElderUserIdAndStatusActive(elderUserId);
        for (FamilyBinding binding : bindings) {
            pushService.sendPush(binding.getFamilyUserId(), title, "【老人漏服提醒】" + content);

            // 记录家属通知日志
            ReminderLog logEntry = new ReminderLog();
            logEntry.setUserId(binding.getFamilyUserId());
            logEntry.setFamilyUserId(binding.getFamilyUserId());
            logEntry.setDate(LocalDate.now());
            logEntry.setType(ReminderType.MISSED);
            logEntry.setChannel(ReminderChannel.PUSH);
            logEntry.setTitle(title);
            logEntry.setContent(content);
            logEntry.setStatus(ReminderStatus.SUCCESS);
            reminderLogRepository.save(logEntry);
        }
    }

    /**
     * 库存不足时通知家属
     */
    private void notifyFamilyForLowStock(Long elderUserId, Medicine medicine) {
        List<FamilyBinding> bindings = familyBindingRepository.findByElderUserIdAndStatusActive(elderUserId);
        for (FamilyBinding binding : bindings) {
            String title = "库存不足提醒";
            String content = String.format("【%s】的 %s 库存仅剩 %d 盒，请提醒及时补充。",
                "老人", medicine.getName(), medicine.getStock());
            pushService.sendPush(binding.getFamilyUserId(), title, content);
        }
    }

    /**
     * 手动触发提醒发送（用于测试）
     */
    @Transactional
    public void triggerReminder(Long scheduleId, Long medicineId) {
        log.info("========== triggerReminder 调用开始 ==========");
        log.info("参数: scheduleId={}, medicineId={}", scheduleId, medicineId);

        ReminderSchedule schedule = reminderScheduleRepository.findById(scheduleId).orElse(null);
        if (schedule == null) {
            log.warn("❌ 提醒计划 {} 不存在，退出", scheduleId);
            log.info("========== triggerReminder 调用结束 ==========");
            return;
        }

        log.info("✓ 找到提醒计划: id={}, name={}, type={}, enabled={}", 
            schedule.getId(), schedule.getName(), schedule.getType(), schedule.getEnabled());

        LocalDate today = LocalDate.now();
        log.info("当前日期: {}", today);

        if (schedule.getType() == ReminderType.STOCK) {
            log.info("┌─────────────────────────────────────────────┐");
            log.info("│              STOCK 类型提醒处理              │");
            log.info("└─────────────────────────────────────────────┘");

            Medicine medicine = medicineRepository.findById(medicineId).orElse(null);
            if (medicine == null) {
                log.warn("❌ 药品 {} 不存在，退出", medicineId);
                log.info("========== triggerReminder 调用结束 ==========");
                return;
            }

            log.info("✓ 找到药品: id={}, name={}, stock={}, userId={}", 
                medicine.getId(), medicine.getName(), medicine.getStock(), medicine.getUserId());

            if (!medicine.getUserId().equals(schedule.getUserId())) {
                log.warn("❌ 药品用户ID({})与计划用户ID({})不匹配，跳过", 
                    medicine.getUserId(), schedule.getUserId());
                log.info("========== triggerReminder 调用结束 ==========");
                return;
            }

            int threshold = schedulerConfig.getStockThreshold();
            log.info("库存阈值: {}, 药品库存: {}", threshold, medicine.getStock());

            if (medicine.getStock() > threshold) {
                log.info("✅ 库存充足({} > {})，无需发送提醒", medicine.getStock(), threshold);
                log.info("========== triggerReminder 调用结束 ==========");
                return;
            }

            log.info("⚠️ 库存不足({} <= {})，需要发送提醒", medicine.getStock(), threshold);

            boolean alreadyReminded = reminderLogRepository.existsByScheduleIdAndMedicineIdAndDateAndType(
                schedule.getId(), medicine.getId(), today, ReminderType.STOCK);

            log.info("去重检查: existsByScheduleIdAndMedicineIdAndDateAndType(" +
                "scheduleId={}, medicineId={}, date={}, type={}) = {}", 
                schedule.getId(), medicine.getId(), today, ReminderType.STOCK, alreadyReminded);

            if (!alreadyReminded) {
                log.info("✓✓✓ 未发送过提醒，开始发送库存不足提醒");
                sendLowStockReminder(schedule, medicine, today);
                log.info("✓✓✓ 库存不足提醒发送完成");
            } else {
                log.info("✅ 今日已发送过库存提醒，跳过发送（去重逻辑生效）");
            }
        } else {
            log.info("┌─────────────────────────────────────────────┐");
            log.info("│           MEDICINE/MISSED 类型提醒处理       │");
            log.info("└─────────────────────────────────────────────┘");

            MedicineReminder mr = medicineReminderRepository.findById(medicineId).orElse(null);
            if (mr == null) {
                log.warn("❌ 药品提醒 {} 不存在，退出", medicineId);
                log.info("========== triggerReminder 调用结束 ==========");
                return;
            }

            log.info("✓ 找到药品提醒: id={}, medicineId={}, enabled={}", 
                mr.getId(), mr.getMedicineId(), mr.getEnabled());

            boolean alreadyReminded = reminderLogRepository.existsByScheduleIdAndMedicineIdAndDateAndType(
                schedule.getId(), mr.getMedicineId(), today, schedule.getType());

            log.info("去重检查: existsByScheduleIdAndMedicineIdAndDateAndType(" +
                "scheduleId={}, medicineId={}, date={}, type={}) = {}", 
                schedule.getId(), mr.getMedicineId(), today, schedule.getType(), alreadyReminded);

            if (!alreadyReminded) {
                log.info("✓✓✓ 未发送过提醒，开始发送");
                sendReminder(schedule, mr, today, LocalTime.now());
                log.info("✓✓✓ 提醒发送完成");
            } else {
                log.info("✅ 今日已发送过提醒，跳过发送（去重逻辑生效）");
            }
        }

        log.info("========== triggerReminder 调用结束 ==========");
    }

    /**
     * 发送短信提醒
     */
    private boolean sendSmsReminder(Long userId, String content) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null || user.getPhone() == null) {
            log.warn("用户 {} 或手机号不存在，无法发送短信", userId);
            return false;
        }

        if (!smsConfig.isAliyunConfigured()) {
            log.warn("阿里云短信未配置，用户 {} 无法收到短信提醒", userId);
            return false;
        }

        // 发送短信（使用提醒模板或默认模板）
        boolean success = aliyunSmsService.sendSms(
            user.getPhone(),
            smsConfig.getTemplateCode(),
            Map.of("content", content)
        );

        if (success) {
            log.info("短信提醒发送成功，用户: {}, 手机号: {}", userId, user.getPhone());
        } else {
            log.error("短信提醒发送失败，用户: {}, 手机号: {}", userId, user.getPhone());
        }

        return success;
    }
}
