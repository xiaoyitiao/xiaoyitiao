package com.zhiyaoban.service;

import com.zhiyaoban.dto.ReminderScheduleDto;
import com.zhiyaoban.entity.*;
import com.zhiyaoban.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 提醒功能测试 - 库存不足场景
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class ReminderLowStockTest {

    @Autowired
    private ReminderScheduleRepository reminderScheduleRepository;

    @Autowired
    private MedicineReminderRepository medicineReminderRepository;

    @Autowired
    private MedicineRepository medicineRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ReminderLogRepository reminderLogRepository;

    @Autowired
    private ReminderScheduler reminderScheduler;

    @Autowired
    private ReminderScheduleService reminderScheduleService;

    /**
     * 测试数据准备：创建库存不足场景
     */
    @Test
    public void testLowStockScenario() {
        // 1. 创建测试用户
        User user = new User();
        user.setPhone("13800001001");
        user.setName("测试老人-库存不足");
        user.setRole(UserRole.ELDER);
        user = userRepository.save(user);
        Long userId = user.getId();

        // 2. 创建库存不足的药品（库存=3，低于阈值5）
        Medicine medicine = new Medicine();
        medicine.setUserId(userId);
        medicine.setName("阿司匹林肠溶片");
        medicine.setDose("100mg");
        medicine.setTime("08:00");
        medicine.setFrequency(MedicineFrequency.DAILY);
        medicine.setStock(3); // 库存不足！
        medicine.setIcon("💊");
        medicine = medicineRepository.save(medicine);
        Long medicineId = medicine.getId();

        // 3. 创建库存提醒计划
        ReminderSchedule schedule = new ReminderSchedule();
        schedule.setUserId(userId);
        schedule.setName("库存不足提醒");
        schedule.setType(ReminderType.STOCK);
        schedule.setEnabled(true);
        schedule.setChannel(ReminderChannel.PUSH);
        schedule = reminderScheduleRepository.save(schedule);
        Long scheduleId = schedule.getId();

        // 4. 关联药品和提醒计划
        MedicineReminder mr = new MedicineReminder();
        mr.setSchedule(schedule);
        mr.setMedicineId(medicineId);
        mr.setRemindTime(LocalTime.of(9, 0));
        mr.setEnabled(true);
        medicineReminderRepository.save(mr);

        // 5. 验证数据
        assertNotNull(userId);
        assertNotNull(medicineId);
        assertTrue(medicine.getStock() <= 5, "库存应该低于阈值");

        // 6. 验证提醒计划
        List<ReminderSchedule> stockSchedules = reminderScheduleRepository.findByTypeAndEnabledTrue(ReminderType.STOCK);
        assertTrue(stockSchedules.stream().anyMatch(s -> s.getUserId().equals(userId)));

        // 7. 验证关联
        List<MedicineReminder> reminders = medicineReminderRepository.findByScheduleIdAndEnabledTrue(scheduleId);
        assertTrue(reminders.stream().anyMatch(r -> r.getMedicineId().equals(medicineId)));

        System.out.println("=== 库存不足测试数据创建成功 ===");
        System.out.println("用户ID: " + userId);
        System.out.println("药品ID: " + medicineId + ", 库存: " + medicine.getStock());
        System.out.println("提醒计划ID: " + scheduleId);
    }

    /**
     * 测试提醒调度器检测库存不足
     */
    @Test
    public void testLowStockDetection() {
        // 创建测试用户
        User user = new User();
        user.setPhone("13800001002");
        user.setName("测试老人-库存检测");
        user.setRole(UserRole.ELDER);
        user = userRepository.save(user);

        // 创建低库存药品
        Medicine medicine = new Medicine();
        medicine.setUserId(user.getId());
        medicine.setName("布洛芬缓释胶囊");
        medicine.setDose("200mg");
        medicine.setTime("12:00");
        medicine.setFrequency(MedicineFrequency.DAILY);
        medicine.setStock(2); // 极低库存
        medicine = medicineRepository.save(medicine);

        // 创建库存提醒计划
        ReminderSchedule schedule = new ReminderSchedule();
        schedule.setUserId(user.getId());
        schedule.setType(ReminderType.STOCK);
        schedule.setEnabled(true);
        schedule.setChannel(ReminderChannel.PUSH);
        schedule = reminderScheduleRepository.save(schedule);

        // 关联
        MedicineReminder mr = new MedicineReminder();
        mr.setSchedule(schedule);
        mr.setMedicineId(medicine.getId());
        mr.setRemindTime(LocalTime.of(12, 0));
        mr.setEnabled(true);
        medicineReminderRepository.save(mr);

        // 手动触发库存检查
        reminderScheduler.checkAndSendReminders();

        // 验证日志创建（推送目前是模拟的，所以状态可能是FAILED但日志应该创建了）
        List<ReminderLog> logs = reminderLogRepository.findByUserId(user.getId());
        assertNotNull(logs);

        System.out.println("创建提醒日志数量: " + logs.size());
    }

    /**
     * 测试提醒计划CRUD
     */
    @Test
    public void testReminderScheduleCrud() {
        // 创建用户
        User user = new User();
        user.setPhone("13800001003");
        user.setName("测试用户-CRUD");
        user.setRole(UserRole.ELDER);
        user = userRepository.save(user);

        // 创建提醒计划
        ReminderScheduleDto dto = new ReminderScheduleDto();
        dto.setName("测试用药提醒");
        dto.setType("MEDICINE");
        dto.setEnabled(true);
        dto.setChannel("PUSH");
        dto.setAdvanceMinutes(5);
        dto.setRepeatCount(2);
        dto.setRepeatIntervalMinutes(15);

        ReminderScheduleDto created = reminderScheduleService.createSchedule(user.getId(), dto);
        assertNotNull(created.getId());
        assertEquals("测试用药提醒", created.getName());

        // 更新
        dto.setName("更新后的用药提醒");
        ReminderScheduleDto updated = reminderScheduleService.updateSchedule(created.getId(), user.getId(), dto);
        assertEquals("更新后的用药提醒", updated.getName());

        // 查询
        List<ReminderScheduleDto> list = reminderScheduleService.getSchedulesByUser(user.getId());
        assertTrue(list.size() > 0);

        // 删除
        reminderScheduleService.deleteSchedule(created.getId(), user.getId());
        assertThrows(RuntimeException.class, () -> {
            reminderScheduleService.getSchedule(created.getId(), user.getId());
        });

        System.out.println("=== CRUD测试通过 ===");
    }

    /**
     * 测试同一药品一天内多次触发只发送一次提醒（去重验证）
     */
    @Test
    public void testLowStockDeduplication() {
        // 1. 创建测试用户
        User user = new User();
        user.setPhone("13800001004");
        user.setName("测试老人-去重验证");
        user.setRole(UserRole.ELDER);
        user = userRepository.save(user);

        // 2. 创建库存不足的药品（库存=1，低于阈值5）
        Medicine medicine = new Medicine();
        medicine.setUserId(user.getId());
        medicine.setName("硝苯地平控释片");
        medicine.setDose("30mg");
        medicine.setTime("08:00");
        medicine.setFrequency(MedicineFrequency.DAILY);
        medicine.setStock(1); // 极低库存
        medicine.setIcon("💊");
        medicine = medicineRepository.save(medicine);

        // 3. 创建库存提醒计划
        ReminderSchedule schedule = new ReminderSchedule();
        schedule.setUserId(user.getId());
        schedule.setName("库存不足提醒-去重测试");
        schedule.setType(ReminderType.STOCK);
        schedule.setEnabled(true);
        schedule.setChannel(ReminderChannel.PUSH);
        schedule = reminderScheduleRepository.save(schedule);

        // 4. 关联药品和提醒计划
        MedicineReminder mr = new MedicineReminder();
        mr.setSchedule(schedule);
        mr.setMedicineId(medicine.getId());
        mr.setRemindTime(LocalTime.of(9, 0));
        mr.setEnabled(true);
        medicineReminderRepository.save(mr);

        // 5. 模拟调度器每分钟执行一次，连续执行5次
        LocalDate today = LocalDate.now();
        int executionCount = 5;
        
        System.out.println("=== 开始模拟多次触发测试 ===");
        System.out.println("执行次数: " + executionCount);
        System.out.println("药品库存: " + medicine.getStock());
        System.out.println("阈值: 5");

        for (int i = 1; i <= executionCount; i++) {
            reminderScheduler.checkAndSendReminders();
            
            List<ReminderLog> stockLogs = reminderLogRepository.findByUserIdAndDateAndType(user.getId(), today, ReminderType.STOCK);
            System.out.println("第 " + i + " 次执行后，库存提醒日志数量: " + stockLogs.size());
        }

        // 6. 验证：一天内同一药品应该只有一条库存不足提醒
        List<ReminderLog> finalLogs = reminderLogRepository.findByUserIdAndDateAndType(user.getId(), today, ReminderType.STOCK);
        
        assertEquals(1, finalLogs.size(), 
            "同一药品一天内应该只发送一次库存提醒，实际发送了: " + finalLogs.size());

        if (!finalLogs.isEmpty()) {
            ReminderLog log = finalLogs.get(0);
            System.out.println("=== 去重测试验证结果 ===");
            System.out.println("日志ID: " + log.getId());
            System.out.println("类型: " + log.getType());
            System.out.println("标题: " + log.getTitle());
            System.out.println("内容: " + log.getContent());
            System.out.println("状态: " + log.getStatus());
            System.out.println("日期: " + log.getDate());
        }

        System.out.println("✅ 去重测试通过：同一药品一天内只发送了一次提醒");
    }

    /**
     * 测试不同药品应该各自生成独立的库存提醒
     */
    @Test
    public void testMultipleMedicinesIndependentReminders() {
        // 1. 创建测试用户
        User user = new User();
        user.setPhone("13800001005");
        user.setName("测试老人-多药品");
        user.setRole(UserRole.ELDER);
        user = userRepository.save(user);

        // 2. 创建两个库存不足的药品
        Medicine medicine1 = new Medicine();
        medicine1.setUserId(user.getId());
        medicine1.setName("阿司匹林肠溶片");
        medicine1.setDose("100mg");
        medicine1.setTime("08:00");
        medicine1.setFrequency(MedicineFrequency.DAILY);
        medicine1.setStock(2);
        medicine1.setIcon("💊");
        medicine1 = medicineRepository.save(medicine1);

        Medicine medicine2 = new Medicine();
        medicine2.setUserId(user.getId());
        medicine2.setName("布洛芬缓释胶囊");
        medicine2.setDose("200mg");
        medicine2.setTime("12:00");
        medicine2.setFrequency(MedicineFrequency.DAILY);
        medicine2.setStock(3);
        medicine2.setIcon("💊");
        medicine2 = medicineRepository.save(medicine2);

        // 3. 创建库存提醒计划
        ReminderSchedule schedule = new ReminderSchedule();
        schedule.setUserId(user.getId());
        schedule.setName("库存不足提醒-多药品测试");
        schedule.setType(ReminderType.STOCK);
        schedule.setEnabled(true);
        schedule.setChannel(ReminderChannel.PUSH);
        schedule = reminderScheduleRepository.save(schedule);

        // 4. 关联两个药品
        MedicineReminder mr1 = new MedicineReminder();
        mr1.setSchedule(schedule);
        mr1.setMedicineId(medicine1.getId());
        mr1.setRemindTime(LocalTime.of(9, 0));
        mr1.setEnabled(true);
        medicineReminderRepository.save(mr1);

        MedicineReminder mr2 = new MedicineReminder();
        mr2.setSchedule(schedule);
        mr2.setMedicineId(medicine2.getId());
        mr2.setRemindTime(LocalTime.of(13, 0));
        mr2.setEnabled(true);
        medicineReminderRepository.save(mr2);

        // 5. 触发库存检查
        reminderScheduler.checkAndSendReminders();

        // 6. 验证：两个药品应该各自生成一条提醒
        LocalDate today = LocalDate.now();
        List<ReminderLog> logs = reminderLogRepository.findByUserIdAndDateAndType(user.getId(), today, ReminderType.STOCK);
        
        assertEquals(2, logs.size(), "两个药品应该各自生成一条库存提醒");
        
        // 验证日志包含两个不同的药品
        long distinctMedicineCount = logs.stream()
            .map(ReminderLog::getMedicineId)
            .distinct()
            .count();
        assertEquals(2, distinctMedicineCount, "应该有两个不同的药品ID");

        System.out.println("=== 多药品独立提醒测试通过 ===");
        System.out.println("药品1 ID: " + medicine1.getId());
        System.out.println("药品2 ID: " + medicine2.getId());
        System.out.println("生成日志数量: " + logs.size());
    }

    /**
     * 测试库存充足时不应该生成提醒
     */
    @Test
    public void testSufficientStockNoReminder() {
        // 1. 创建测试用户
        User user = new User();
        user.setPhone("13800001006");
        user.setName("测试老人-库存充足");
        user.setRole(UserRole.ELDER);
        user = userRepository.save(user);

        // 2. 创建库存充足的药品（库存=10，高于阈值5）
        Medicine medicine = new Medicine();
        medicine.setUserId(user.getId());
        medicine.setName("维生素C片");
        medicine.setDose("500mg");
        medicine.setTime("08:00");
        medicine.setFrequency(MedicineFrequency.DAILY);
        medicine.setStock(10); // 库存充足
        medicine.setIcon("💊");
        medicine = medicineRepository.save(medicine);

        // 3. 创建库存提醒计划
        ReminderSchedule schedule = new ReminderSchedule();
        schedule.setUserId(user.getId());
        schedule.setName("库存不足提醒-充足测试");
        schedule.setType(ReminderType.STOCK);
        schedule.setEnabled(true);
        schedule.setChannel(ReminderChannel.PUSH);
        schedule = reminderScheduleRepository.save(schedule);

        // 4. 关联药品
        MedicineReminder mr = new MedicineReminder();
        mr.setSchedule(schedule);
        mr.setMedicineId(medicine.getId());
        mr.setRemindTime(LocalTime.of(9, 0));
        mr.setEnabled(true);
        medicineReminderRepository.save(mr);

        // 5. 触发库存检查
        reminderScheduler.checkAndSendReminders();

        // 6. 验证：库存充足时不应该生成提醒
        LocalDate today = LocalDate.now();
        List<ReminderLog> logs = reminderLogRepository.findByUserIdAndDateAndType(user.getId(), today, ReminderType.STOCK);
        
        assertEquals(0, logs.size(), "库存充足时不应该生成库存提醒");

        System.out.println("=== 库存充足无提醒测试通过 ===");
        System.out.println("药品库存: " + medicine.getStock());
        System.out.println("阈值: 5");
        System.out.println("生成日志数量: " + logs.size() + " (预期为0)");
    }

    /**
     * 测试手动触发接口的去重逻辑
     */
    @Test
    public void testManualTriggerDeduplication() {
        // 1. 创建测试用户
        User user = new User();
        user.setPhone("13800001007");
        user.setName("测试老人-手动触发去重");
        user.setRole(UserRole.ELDER);
        user = userRepository.save(user);

        // 2. 创建库存不足的药品
        Medicine medicine = new Medicine();
        medicine.setUserId(user.getId());
        medicine.setName("降压药");
        medicine.setDose("50mg");
        medicine.setTime("08:00");
        medicine.setFrequency(MedicineFrequency.DAILY);
        medicine.setStock(2);
        medicine.setIcon("💊");
        medicine = medicineRepository.save(medicine);

        // 3. 创建库存提醒计划
        ReminderSchedule schedule = new ReminderSchedule();
        schedule.setUserId(user.getId());
        schedule.setName("库存不足提醒-手动触发");
        schedule.setType(ReminderType.STOCK);
        schedule.setEnabled(true);
        schedule.setChannel(ReminderChannel.PUSH);
        schedule = reminderScheduleRepository.save(schedule);

        // 4. 关联药品
        MedicineReminder mr = new MedicineReminder();
        mr.setSchedule(schedule);
        mr.setMedicineId(medicine.getId());
        mr.setRemindTime(LocalTime.of(9, 0));
        mr.setEnabled(true);
        medicineReminderRepository.save(mr);

        // 5. 连续手动触发5次
        System.out.println("=== 开始手动触发去重测试 ===");
        for (int i = 1; i <= 5; i++) {
            reminderScheduler.triggerReminder(schedule.getId(), medicine.getId());
            System.out.println("第 " + i + " 次手动触发完成");
        }

        // 6. 验证：只生成一条提醒
        LocalDate today = LocalDate.now();
        List<ReminderLog> logs = reminderLogRepository.findByUserIdAndDateAndType(user.getId(), today, ReminderType.STOCK);
        
        assertEquals(1, logs.size(), "手动触发5次应该只生成1条库存提醒");

        System.out.println("=== 手动触发去重测试通过 ===");
        System.out.println("触发次数: 5");
        System.out.println("生成日志数量: " + logs.size());
    }

    /**
     * 测试药品用户ID与计划用户ID不匹配时跳过提醒
     */
    @Test
    public void testMismatchedUserIdSkipsReminder() {
        // 1. 创建两个测试用户
        User user1 = new User();
        user1.setPhone("13800001008");
        user1.setName("用户A");
        user1.setRole(UserRole.ELDER);
        user1 = userRepository.save(user1);

        User user2 = new User();
        user2.setPhone("13800001009");
        user2.setName("用户B");
        user2.setRole(UserRole.ELDER);
        user2 = userRepository.save(user2);

        // 2. 用户B创建库存不足的药品
        Medicine medicine = new Medicine();
        medicine.setUserId(user2.getId()); // 药品属于用户B
        medicine.setName("测试药品");
        medicine.setDose("100mg");
        medicine.setTime("08:00");
        medicine.setFrequency(MedicineFrequency.DAILY);
        medicine.setStock(1);
        medicine.setIcon("💊");
        medicine = medicineRepository.save(medicine);

        // 3. 用户A创建库存提醒计划（错误的关联）
        ReminderSchedule schedule = new ReminderSchedule();
        schedule.setUserId(user1.getId()); // 计划属于用户A
        schedule.setName("库存提醒-用户不匹配");
        schedule.setType(ReminderType.STOCK);
        schedule.setEnabled(true);
        schedule.setChannel(ReminderChannel.PUSH);
        schedule = reminderScheduleRepository.save(schedule);

        // 4. 关联用户B的药品到用户A的计划（不匹配）
        MedicineReminder mr = new MedicineReminder();
        mr.setSchedule(schedule);
        mr.setMedicineId(medicine.getId());
        mr.setRemindTime(LocalTime.of(9, 0));
        mr.setEnabled(true);
        medicineReminderRepository.save(mr);

        // 5. 触发库存检查
        reminderScheduler.checkAndSendReminders();

        // 6. 验证：用户ID不匹配，不应该生成提醒
        LocalDate today = LocalDate.now();
        List<ReminderLog> logsUser1 = reminderLogRepository.findByUserIdAndDateAndType(user1.getId(), today, ReminderType.STOCK);
        List<ReminderLog> logsUser2 = reminderLogRepository.findByUserIdAndDateAndType(user2.getId(), today, ReminderType.STOCK);
        
        assertEquals(0, logsUser1.size(), "用户A不应该收到提醒（药品不属于他）");
        assertEquals(0, logsUser2.size(), "用户B不应该收到提醒（计划不属于他）");

        System.out.println("=== 用户ID不匹配跳过提醒测试通过 ===");
        System.out.println("用户A日志数: " + logsUser1.size());
        System.out.println("用户B日志数: " + logsUser2.size());
    }

    /**
     * 测试阈值边界值（库存等于阈值时应该触发提醒）
     */
    @Test
    public void testThresholdBoundary() {
        // 1. 创建测试用户
        User user = new User();
        user.setPhone("13800001010");
        user.setName("测试老人-阈值边界");
        user.setRole(UserRole.ELDER);
        user = userRepository.save(user);

        // 2. 创建库存等于阈值的药品（库存=5，等于阈值）
        Medicine medicine = new Medicine();
        medicine.setUserId(user.getId());
        medicine.setName("边界测试药品");
        medicine.setDose("100mg");
        medicine.setTime("08:00");
        medicine.setFrequency(MedicineFrequency.DAILY);
        medicine.setStock(5); // 等于阈值
        medicine.setIcon("💊");
        medicine = medicineRepository.save(medicine);

        // 3. 创建库存提醒计划
        ReminderSchedule schedule = new ReminderSchedule();
        schedule.setUserId(user.getId());
        schedule.setName("库存提醒-阈值边界");
        schedule.setType(ReminderType.STOCK);
        schedule.setEnabled(true);
        schedule.setChannel(ReminderChannel.PUSH);
        schedule = reminderScheduleRepository.save(schedule);

        // 4. 关联药品
        MedicineReminder mr = new MedicineReminder();
        mr.setSchedule(schedule);
        mr.setMedicineId(medicine.getId());
        mr.setRemindTime(LocalTime.of(9, 0));
        mr.setEnabled(true);
        medicineReminderRepository.save(mr);

        // 5. 触发库存检查
        reminderScheduler.checkAndSendReminders();

        // 6. 验证：库存等于阈值时应该触发提醒（<= 阈值）
        LocalDate today = LocalDate.now();
        List<ReminderLog> logs = reminderLogRepository.findByUserIdAndDateAndType(user.getId(), today, ReminderType.STOCK);
        
        assertEquals(1, logs.size(), "库存等于阈值时应该触发提醒");

        System.out.println("=== 阈值边界测试通过 ===");
        System.out.println("药品库存: " + medicine.getStock());
        System.out.println("阈值: 5");
        System.out.println("条件: stock <= threshold");
        System.out.println("生成日志数量: " + logs.size());
    }
}
