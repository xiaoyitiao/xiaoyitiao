package com.zhiyaoban.service;

import com.zhiyaoban.dto.ReminderScheduleDto;
import com.zhiyaoban.entity.*;
import com.zhiyaoban.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 提醒计划服务
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReminderScheduleService {

    private final ReminderScheduleRepository reminderScheduleRepository;
    private final MedicineReminderRepository medicineReminderRepository;
    private final MedicineRepository medicineRepository;
    private final FamilyBindingRepository familyBindingRepository;
    private final UserRepository userRepository;

    /**
     * 获取用户所有提醒计划
     */
    public List<ReminderScheduleDto> getSchedulesByUser(Long userId) {
        return reminderScheduleRepository.findByUserId(userId).stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    /**
     * 获取用户启用的提醒计划
     */
    public List<ReminderScheduleDto> getEnabledSchedulesByUser(Long userId) {
        return reminderScheduleRepository.findByUserIdAndEnabledTrue(userId).stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    /**
     * 获取提醒计划详情
     */
    public ReminderScheduleDto getSchedule(Long scheduleId, Long userId) {
        ReminderSchedule schedule = reminderScheduleRepository.findById(scheduleId)
            .orElseThrow(() -> new RuntimeException("提醒计划不存在"));
        if (!schedule.getUserId().equals(userId)) {
            throw new RuntimeException("无权限查看此提醒计划");
        }
        return toDto(schedule);
    }

    /**
     * 创建提醒计划
     */
    @Transactional
    public ReminderScheduleDto createSchedule(Long userId, ReminderScheduleDto dto) {
        ReminderSchedule schedule = new ReminderSchedule();
        schedule.setUserId(userId);
        schedule.setName(dto.getName());
        schedule.setType(ReminderType.valueOf(dto.getType()));
        schedule.setEnabled(dto.getEnabled() != null ? dto.getEnabled() : true);
        schedule.setAdvanceMinutes(dto.getAdvanceMinutes() != null ? dto.getAdvanceMinutes() : 0);
        schedule.setRepeatCount(dto.getRepeatCount() != null ? dto.getRepeatCount() : 1);
        schedule.setRepeatIntervalMinutes(dto.getRepeatIntervalMinutes() != null ? dto.getRepeatIntervalMinutes() : 30);
        schedule.setChannel(ReminderChannel.valueOf(dto.getChannel() != null ? dto.getChannel() : "PUSH"));
        schedule.setQuietHoursStart(dto.getQuietHoursStart());
        schedule.setQuietHoursEnd(dto.getQuietHoursEnd());
        schedule.setWeekDays(dto.getWeekDays());
        schedule.setStartDate(dto.getStartDate());
        schedule.setEndDate(dto.getEndDate());

        schedule = reminderScheduleRepository.save(schedule);

        // 保存药品提醒关联
        if (dto.getMedicineItems() != null) {
            for (ReminderScheduleDto.MedicineReminderItem item : dto.getMedicineItems()) {
                MedicineReminder mr = new MedicineReminder();
                mr.setSchedule(schedule);
                mr.setMedicineId(item.getMedicineId());
                mr.setRemindTime(item.getRemindTime());
                mr.setDose(item.getDose());
                mr.setEnabled(item.getEnabled() != null ? item.getEnabled() : true);
                medicineReminderRepository.save(mr);
            }
        }

        return toDto(schedule);
    }

    /**
     * 更新提醒计划
     */
    @Transactional
    public ReminderScheduleDto updateSchedule(Long scheduleId, Long userId, ReminderScheduleDto dto) {
        ReminderSchedule schedule = reminderScheduleRepository.findById(scheduleId)
            .orElseThrow(() -> new RuntimeException("提醒计划不存在"));
        if (!schedule.getUserId().equals(userId)) {
            throw new RuntimeException("无权限修改此提醒计划");
        }

        if (dto.getName() != null) {
            schedule.setName(dto.getName());
        }
        if (dto.getType() != null) {
            schedule.setType(ReminderType.valueOf(dto.getType()));
        }
        if (dto.getEnabled() != null) {
            schedule.setEnabled(dto.getEnabled());
        }
        if (dto.getAdvanceMinutes() != null) {
            schedule.setAdvanceMinutes(dto.getAdvanceMinutes());
        }
        if (dto.getRepeatCount() != null) {
            schedule.setRepeatCount(dto.getRepeatCount());
        }
        if (dto.getRepeatIntervalMinutes() != null) {
            schedule.setRepeatIntervalMinutes(dto.getRepeatIntervalMinutes());
        }
        if (dto.getChannel() != null) {
            schedule.setChannel(ReminderChannel.valueOf(dto.getChannel()));
        }
        if (dto.getQuietHoursStart() != null) {
            schedule.setQuietHoursStart(dto.getQuietHoursStart());
        }
        if (dto.getQuietHoursEnd() != null) {
            schedule.setQuietHoursEnd(dto.getQuietHoursEnd());
        }
        if (dto.getWeekDays() != null) {
            schedule.setWeekDays(dto.getWeekDays());
        }
        if (dto.getStartDate() != null) {
            schedule.setStartDate(dto.getStartDate());
        }
        if (dto.getEndDate() != null) {
            schedule.setEndDate(dto.getEndDate());
        }

        // 更新药品提醒关联
        if (dto.getMedicineItems() != null) {
            // 删除旧的关联
            medicineReminderRepository.deleteByScheduleId(scheduleId);
            // 添加新的关联
            for (ReminderScheduleDto.MedicineReminderItem item : dto.getMedicineItems()) {
                MedicineReminder mr = new MedicineReminder();
                mr.setSchedule(schedule);
                mr.setMedicineId(item.getMedicineId());
                mr.setRemindTime(item.getRemindTime());
                mr.setDose(item.getDose());
                mr.setEnabled(item.getEnabled() != null ? item.getEnabled() : true);
                medicineReminderRepository.save(mr);
            }
        }

        schedule = reminderScheduleRepository.save(schedule);
        return toDto(schedule);
    }

    /**
     * 删除提醒计划
     */
    @Transactional
    public void deleteSchedule(Long scheduleId, Long userId) {
        ReminderSchedule schedule = reminderScheduleRepository.findById(scheduleId)
            .orElseThrow(() -> new RuntimeException("提醒计划不存在"));
        if (!schedule.getUserId().equals(userId)) {
            throw new RuntimeException("无权限删除此提醒计划");
        }
        medicineReminderRepository.deleteByScheduleId(scheduleId);
        reminderScheduleRepository.delete(schedule);
    }

    /**
     * 启用/禁用提醒计划
     */
    @Transactional
    public void setScheduleEnabled(Long scheduleId, Long userId, boolean enabled) {
        ReminderSchedule schedule = reminderScheduleRepository.findById(scheduleId)
            .orElseThrow(() -> new RuntimeException("提醒计划不存在"));
        if (!schedule.getUserId().equals(userId)) {
            throw new RuntimeException("无权限修改此提醒计划");
        }
        schedule.setEnabled(enabled);
        reminderScheduleRepository.save(schedule);
    }

    /**
     * 获取指定日期需要提醒的药品
     */
    public List<MedicineReminder> getRemindersForDate(LocalDate date, int dayOfWeek) {
        // 获取所有在有效期内的启用计划
        List<ReminderSchedule> schedules = reminderScheduleRepository.findAll().stream()
            .filter(s -> s.getEnabled())
            .filter(s -> s.isValidForDate(date))
            .filter(s -> s.isValidForDayOfWeek(dayOfWeek))
            .collect(Collectors.toList());

        List<MedicineReminder> result = new ArrayList<>();
        for (ReminderSchedule schedule : schedules) {
            List<MedicineReminder> items = medicineReminderRepository.findByScheduleIdAndEnabledTrue(schedule.getId());
            result.addAll(items);
        }
        return result;
    }

    /**
     * 转换为DTO
     */
    private ReminderScheduleDto toDto(ReminderSchedule schedule) {
        ReminderScheduleDto dto = new ReminderScheduleDto();
        dto.setId(schedule.getId());
        dto.setUserId(schedule.getUserId());
        dto.setName(schedule.getName());
        dto.setType(schedule.getType().name());
        dto.setEnabled(schedule.getEnabled());
        dto.setAdvanceMinutes(schedule.getAdvanceMinutes());
        dto.setRepeatCount(schedule.getRepeatCount());
        dto.setRepeatIntervalMinutes(schedule.getRepeatIntervalMinutes());
        dto.setChannel(schedule.getChannel().name());
        dto.setQuietHoursStart(schedule.getQuietHoursStart());
        dto.setQuietHoursEnd(schedule.getQuietHoursEnd());
        dto.setWeekDays(schedule.getWeekDays());
        dto.setStartDate(schedule.getStartDate());
        dto.setEndDate(schedule.getEndDate());

        // 获取药品提醒项
        List<MedicineReminder> items = medicineReminderRepository.findByScheduleId(schedule.getId());
        if (!items.isEmpty()) {
            List<ReminderScheduleDto.MedicineReminderItem> itemDtos = items.stream()
                .map(mr -> {
                    ReminderScheduleDto.MedicineReminderItem item = new ReminderScheduleDto.MedicineReminderItem();
                    item.setMedicineId(mr.getMedicineId());
                    item.setRemindTime(mr.getRemindTime());
                    item.setDose(mr.getDose());
                    item.setEnabled(mr.getEnabled());
                    return item;
                })
                .collect(Collectors.toList());
            dto.setMedicineItems(itemDtos);
        }

        return dto;
    }
}
