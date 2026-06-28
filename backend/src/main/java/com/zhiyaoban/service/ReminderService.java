package com.zhiyaoban.service;

import com.zhiyaoban.dto.ReminderLogDto;
import com.zhiyaoban.entity.CheckIn;
import com.zhiyaoban.entity.Medicine;
import com.zhiyaoban.entity.ReminderLog;
import com.zhiyaoban.entity.ReminderChannel;
import com.zhiyaoban.entity.ReminderStatus;
import com.zhiyaoban.entity.ReminderType;
import com.zhiyaoban.repository.CheckInRepository;
import com.zhiyaoban.repository.MedicineRepository;
import com.zhiyaoban.repository.ReminderLogRepository;
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
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * 提醒服务
 * 后端定时任务每分钟轮询，对到点未打卡的老人发送提醒
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReminderService {

    private final MedicineRepository medicineRepository;
    private final CheckInRepository checkInRepository;
    private final ReminderLogRepository reminderLogRepository;
    private final PushService pushService;

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    /**
     * 每分钟执行一次：检查当前时间是否有药品需要提醒
     */
    @Scheduled(cron = "0 * * * * ?")
    @Transactional
    public void checkAndSendReminders() {
        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();
        String currentTime = now.format(TIME_FORMATTER);

        // 简化处理：只匹配 daily 频率且时间在当前分钟的药品
        List<Medicine> medicines = medicineRepository.findAll();
        for (Medicine medicine : medicines) {
            if (!"daily".equals(medicine.getFrequency())) {
                continue;
            }
            if (!medicine.getTime().equals(currentTime)) {
                continue;
            }

            Long userId = medicine.getUserId();
            Optional<CheckIn> checkInOpt = checkInRepository.findByUserIdAndMedicineIdAndDate(userId, medicine.getId(), today);
            if (checkInOpt.isPresent()) {
                continue; // 已打卡，不再提醒
            }

            sendReminder(userId, medicine, today, "DUE", "到点提醒：该服用 " + medicine.getName() + " 了");
        }
    }

    /**
     * 每 30 分钟执行一次：检查漏服提醒
     */
    @Scheduled(cron = "0 */30 * * * ?")
    @Transactional
    public void checkMissedReminders() {
        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();

        List<Medicine> medicines = medicineRepository.findAll();
        for (Medicine medicine : medicines) {
            if (!"daily".equals(medicine.getFrequency())) {
                continue;
            }
            LocalTime medTime = LocalTime.parse(medicine.getTime());
            if (java.time.Duration.between(medTime, now).toMinutes() < 30) {
                continue; // 未超过 30 分钟
            }

            Long userId = medicine.getUserId();
            Optional<CheckIn> checkInOpt = checkInRepository.findByUserIdAndMedicineIdAndDate(userId, medicine.getId(), today);
            if (checkInOpt.isPresent()) {
                continue;
            }

            sendReminder(userId, medicine, today, "MISSED", "漏服提醒：您尚未服用 " + medicine.getName());
        }
    }

    private void sendReminder(Long userId, Medicine medicine, LocalDate date, String type, String message) {
        Optional<ReminderLog> existing = reminderLogRepository
            .findByUserIdAndMedicineIdAndDateAndType(userId, medicine.getId(), date, ReminderType.valueOf(type));
        if (existing.isPresent() && "SUCCESS".equals(existing.get().getStatus())) {
            return; // 已成功发送过
        }

        ReminderLog log = existing.orElseGet(ReminderLog::new);
        log.setUserId(userId);
        log.setMedicineId(medicine.getId());
        log.setDate(date);
        log.setType(ReminderType.valueOf(type));
        log.setChannel(ReminderChannel.PUSH);

        try {
            boolean pushed = pushService.sendPush(userId, "智药伴用药提醒", message);
            if (pushed) {
                log.setStatus(ReminderStatus.SUCCESS);
                log.setSentAt(LocalDateTime.now());
            } else {
                log.setStatus(ReminderStatus.FAILED);
                log.setErrorMsg("无有效推送订阅");
            }
        } catch (Exception e) {
            log.setStatus(ReminderStatus.FAILED);
            log.setErrorMsg(e.getMessage());
        }
        reminderLogRepository.save(log);
    }

    /**
     * 查询提醒日志
     */
    public List<ReminderLogDto> getLogs(Long userId, String type, String status) {
        List<ReminderLog> logs;

        if (userId != null && type != null && status != null) {
            ReminderType reminderType = ReminderType.valueOf(type);
            ReminderStatus reminderStatus = ReminderStatus.valueOf(status);
            logs = reminderLogRepository.findByUserIdAndTypeAndStatus(userId, reminderType, reminderStatus);
        } else if (userId != null && type != null) {
            ReminderType reminderType = ReminderType.valueOf(type);
            logs = reminderLogRepository.findByUserIdAndType(userId, reminderType);
        } else if (userId != null && status != null) {
            ReminderStatus reminderStatus = ReminderStatus.valueOf(status);
            logs = reminderLogRepository.findByUserIdAndStatus(userId, reminderStatus);
        } else if (userId != null) {
            logs = reminderLogRepository.findByUserId(userId);
        } else {
            logs = reminderLogRepository.findAll();
        }

        return logs.stream().map(this::toDto).collect(Collectors.toList());
    }

    private ReminderLogDto toDto(ReminderLog log) {
        ReminderLogDto dto = new ReminderLogDto();
        dto.setId(log.getId());
        dto.setUserId(log.getUserId());
        dto.setMedicineId(log.getMedicineId());
        dto.setDate(log.getDate());
        dto.setType(log.getType() != null ? log.getType().name() : null);
        dto.setChannel(log.getChannel() != null ? log.getChannel().name() : null);
        dto.setSentAt(log.getSentAt());
        dto.setStatus(log.getStatus() != null ? log.getStatus().name() : null);
        dto.setErrorMsg(log.getErrorMsg());
        dto.setCreatedAt(log.getCreatedAt());
        dto.setScheduleId(log.getScheduleId());
        dto.setFamilyUserId(log.getFamilyUserId());
        dto.setTitle(log.getTitle());
        dto.setContent(log.getContent());
        dto.setRetryCount(log.getRetryCount());
        dto.setReadAt(log.getReadAt());

        if (log.getMedicineId() != null) {
            medicineRepository.findById(log.getMedicineId()).ifPresent(medicine -> dto.setMedicineName(medicine.getName()));
        }

        return dto;
    }
}
