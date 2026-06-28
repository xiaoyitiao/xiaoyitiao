package com.zhiyaoban.service;

import com.zhiyaoban.config.SchedulerConfig;
import com.zhiyaoban.entity.*;
import com.zhiyaoban.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * 库存不足提醒去重逻辑单元测试
 * 使用 Mock 对象模拟依赖，无需完整 Spring 环境
 */
@ExtendWith(MockitoExtension.class)
public class ReminderDeduplicationTest {

    @Mock
    private ReminderScheduleRepository reminderScheduleRepository;

    @Mock
    private MedicineReminderRepository medicineReminderRepository;

    @Mock
    private MedicineRepository medicineRepository;

    @Mock
    private CheckInRepository checkInRepository;

    @Mock
    private ReminderLogRepository reminderLogRepository;

    @Mock
    private PushService pushService;

    @Mock
    private FamilyBindingRepository familyBindingRepository;

    @Mock
    private SchedulerConfig schedulerConfig;

    @InjectMocks
    private ReminderScheduler reminderScheduler;

    private ReminderSchedule stockSchedule;
    private Medicine lowStockMedicine;
    private LocalDate today;

    @BeforeEach
    void setUp() {
        today = LocalDate.now();

        stockSchedule = new ReminderSchedule();
        stockSchedule.setId(1L);
        stockSchedule.setUserId(1001L);
        stockSchedule.setName("库存不足提醒");
        stockSchedule.setType(ReminderType.STOCK);
        stockSchedule.setEnabled(true);
        stockSchedule.setChannel(ReminderChannel.PUSH);

        lowStockMedicine = new Medicine();
        lowStockMedicine.setId(2001L);
        lowStockMedicine.setUserId(1001L);
        lowStockMedicine.setName("硝苯地平控释片");
        lowStockMedicine.setDose("30mg");
        lowStockMedicine.setTime("08:00");
        lowStockMedicine.setFrequency(MedicineFrequency.DAILY);
        lowStockMedicine.setStock(2);
        lowStockMedicine.setIcon("💊");

        when(schedulerConfig.isEnabled()).thenReturn(true);
        when(schedulerConfig.getStockThreshold()).thenReturn(5);
        when(schedulerConfig.getMissedDelayMinutes()).thenReturn(30);

        when(reminderScheduleRepository.findById(1L)).thenReturn(Optional.of(stockSchedule));
        when(medicineRepository.findById(2001L)).thenReturn(Optional.of(lowStockMedicine));
        when(familyBindingRepository.findByElderUserIdAndStatusActive(anyLong())).thenReturn(new ArrayList<>());
        when(pushService.sendPush(anyLong(), anyString(), anyString())).thenReturn(false);
    }

    /**
     * 测试同一药品连续触发5次只生成1条提醒日志（去重验证）
     */
    @Test
    void testTriggerReminderDeduplication() {
        System.out.println("=== 开始测试：连续触发5次去重验证 ===");

        List<ReminderLog> createdLogs = new ArrayList<>();

        doAnswer(invocation -> {
            ReminderLog log = invocation.getArgument(0);
            createdLogs.add(log);
            System.out.println("  创建日志: type=" + log.getType() + 
                ", medicineId=" + log.getMedicineId() + 
                ", status=" + log.getStatus());
            return null;
        }).when(reminderLogRepository).save(any(ReminderLog.class));

        when(reminderLogRepository.existsByScheduleIdAndMedicineIdAndDateAndType(
            eq(1L), eq(2001L), eq(today), eq(ReminderType.STOCK)))
            .thenReturn(false)
            .thenReturn(true)
            .thenReturn(true)
            .thenReturn(true)
            .thenReturn(true);

        for (int i = 1; i <= 5; i++) {
            System.out.println("  第 " + i + " 次调用 triggerReminder...");
            reminderScheduler.triggerReminder(1L, 2001L);
        }

        assertEquals(1, createdLogs.size(), 
            "预期只生成1条日志，实际生成了: " + createdLogs.size());

        if (!createdLogs.isEmpty()) {
            ReminderLog log = createdLogs.get(0);
            assertEquals(ReminderType.STOCK, log.getType());
            assertEquals(2001L, log.getMedicineId());
            assertEquals(1L, log.getScheduleId());
            assertEquals(1001L, log.getUserId());
            assertEquals(today, log.getDate());
        }

        System.out.println("=== 测试完成 ===");
        System.out.println("  触发次数: 5");
        System.out.println("  生成日志数: " + createdLogs.size());
        System.out.println("  ✅ 去重逻辑生效！");
    }

    /**
     * 测试库存充足时不生成提醒
     */
    @Test
    void testSufficientStockNoReminder() {
        System.out.println("=== 开始测试：库存充足不生成提醒 ===");

        Medicine sufficientMedicine = new Medicine();
        sufficientMedicine.setId(2002L);
        sufficientMedicine.setUserId(1001L);
        sufficientMedicine.setName("维生素C片");
        sufficientMedicine.setStock(10);

        when(medicineRepository.findById(2002L)).thenReturn(Optional.of(sufficientMedicine));

        List<ReminderLog> createdLogs = new ArrayList<>();
        doAnswer(invocation -> {
            createdLogs.add(invocation.getArgument(0));
            return null;
        }).when(reminderLogRepository).save(any(ReminderLog.class));

        reminderScheduler.triggerReminder(1L, 2002L);

        assertEquals(0, createdLogs.size(), 
            "库存充足时不应该生成提醒日志");

        System.out.println("=== 测试完成 ===");
        System.out.println("  药品库存: 10");
        System.out.println("  阈值: 5");
        System.out.println("  生成日志数: " + createdLogs.size());
        System.out.println("  ✅ 库存充足时不生成提醒！");
    }

    /**
     * 测试用户ID不匹配时跳过提醒
     */
    @Test
    void testMismatchedUserIdSkipsReminder() {
        System.out.println("=== 开始测试：用户ID不匹配跳过提醒 ===");

        Medicine otherUserMedicine = new Medicine();
        otherUserMedicine.setId(2003L);
        otherUserMedicine.setUserId(1002L);
        otherUserMedicine.setName("测试药品");
        otherUserMedicine.setStock(1);

        when(medicineRepository.findById(2003L)).thenReturn(Optional.of(otherUserMedicine));

        List<ReminderLog> createdLogs = new ArrayList<>();
        doAnswer(invocation -> {
            createdLogs.add(invocation.getArgument(0));
            return null;
        }).when(reminderLogRepository).save(any(ReminderLog.class));

        reminderScheduler.triggerReminder(1L, 2003L);

        assertEquals(0, createdLogs.size(), 
            "用户ID不匹配时不应该生成提醒日志");

        System.out.println("=== 测试完成 ===");
        System.out.println("  计划用户ID: 1001");
        System.out.println("  药品用户ID: 1002");
        System.out.println("  生成日志数: " + createdLogs.size());
        System.out.println("  ✅ 用户ID不匹配时跳过提醒！");
    }

    /**
     * 测试不同药品各自生成独立提醒
     */
    @Test
    void testDifferentMedicinesIndependentReminders() {
        System.out.println("=== 开始测试：不同药品各自生成独立提醒 ===");

        Medicine medicine1 = new Medicine();
        medicine1.setId(2004L);
        medicine1.setUserId(1001L);
        medicine1.setName("药品A");
        medicine1.setStock(2);

        Medicine medicine2 = new Medicine();
        medicine2.setId(2005L);
        medicine2.setUserId(1001L);
        medicine2.setName("药品B");
        medicine2.setStock(3);

        when(medicineRepository.findById(2004L)).thenReturn(Optional.of(medicine1));
        when(medicineRepository.findById(2005L)).thenReturn(Optional.of(medicine2));

        List<ReminderLog> createdLogs = new ArrayList<>();
        doAnswer(invocation -> {
            ReminderLog log = invocation.getArgument(0);
            createdLogs.add(log);
            System.out.println("  创建日志: medicineId=" + log.getMedicineId() + 
                ", medicineName=" + (log.getMedicineId() == 2004L ? "药品A" : "药品B"));
            return null;
        }).when(reminderLogRepository).save(any(ReminderLog.class));

        when(reminderLogRepository.existsByScheduleIdAndMedicineIdAndDateAndType(
            eq(1L), eq(2004L), eq(today), eq(ReminderType.STOCK))).thenReturn(false);
        when(reminderLogRepository.existsByScheduleIdAndMedicineIdAndDateAndType(
            eq(1L), eq(2005L), eq(today), eq(ReminderType.STOCK))).thenReturn(false);

        System.out.println("  触发药品A提醒...");
        reminderScheduler.triggerReminder(1L, 2004L);

        System.out.println("  触发药品B提醒...");
        reminderScheduler.triggerReminder(1L, 2005L);

        assertEquals(2, createdLogs.size(), 
            "两个不同药品应该各自生成一条提醒日志");

        long distinctMedicineCount = createdLogs.stream()
            .map(ReminderLog::getMedicineId)
            .distinct()
            .count();
        assertEquals(2, distinctMedicineCount, 
            "应该有两个不同的药品ID");

        System.out.println("=== 测试完成 ===");
        System.out.println("  药品数量: 2");
        System.out.println("  生成日志数: " + createdLogs.size());
        System.out.println("  ✅ 不同药品各自生成独立提醒！");
    }

    /**
     * 测试阈值边界值（库存等于阈值时触发提醒）
     */
    @Test
    void testThresholdBoundary() {
        System.out.println("=== 开始测试：阈值边界值 ===");

        Medicine boundaryMedicine = new Medicine();
        boundaryMedicine.setId(2006L);
        boundaryMedicine.setUserId(1001L);
        boundaryMedicine.setName("边界测试药品");
        boundaryMedicine.setStock(5);

        when(medicineRepository.findById(2006L)).thenReturn(Optional.of(boundaryMedicine));

        List<ReminderLog> createdLogs = new ArrayList<>();
        doAnswer(invocation -> {
            createdLogs.add(invocation.getArgument(0));
            return null;
        }).when(reminderLogRepository).save(any(ReminderLog.class));

        when(reminderLogRepository.existsByScheduleIdAndMedicineIdAndDateAndType(
            eq(1L), eq(2006L), eq(today), eq(ReminderType.STOCK))).thenReturn(false);

        reminderScheduler.triggerReminder(1L, 2006L);

        assertEquals(1, createdLogs.size(), 
            "库存等于阈值时应该触发提醒");

        System.out.println("=== 测试完成 ===");
        System.out.println("  药品库存: 5");
        System.out.println("  阈值: 5");
        System.out.println("  条件: stock <= threshold");
        System.out.println("  生成日志数: " + createdLogs.size());
        System.out.println("  ✅ 阈值边界测试通过！");
    }

    /**
     * 测试计划不存在时的异常处理
     */
    @Test
    void testScheduleNotFound() {
        System.out.println("=== 开始测试：计划不存在 ===");

        when(reminderScheduleRepository.findById(9999L)).thenReturn(Optional.empty());

        List<ReminderLog> createdLogs = new ArrayList<>();
        doAnswer(invocation -> {
            createdLogs.add(invocation.getArgument(0));
            return null;
        }).when(reminderLogRepository).save(any(ReminderLog.class));

        reminderScheduler.triggerReminder(9999L, 2001L);

        assertEquals(0, createdLogs.size(), 
            "计划不存在时不应该生成提醒日志");

        System.out.println("=== 测试完成 ===");
        System.out.println("  计划ID: 9999（不存在）");
        System.out.println("  生成日志数: " + createdLogs.size());
        System.out.println("  ✅ 计划不存在时正确处理！");
    }

    /**
     * 测试药品不存在时的异常处理
     */
    @Test
    void testMedicineNotFound() {
        System.out.println("=== 开始测试：药品不存在 ===");

        when(medicineRepository.findById(9999L)).thenReturn(Optional.empty());

        List<ReminderLog> createdLogs = new ArrayList<>();
        doAnswer(invocation -> {
            createdLogs.add(invocation.getArgument(0));
            return null;
        }).when(reminderLogRepository).save(any(ReminderLog.class));

        reminderScheduler.triggerReminder(1L, 9999L);

        assertEquals(0, createdLogs.size(), 
            "药品不存在时不应该生成提醒日志");

        System.out.println("=== 测试完成 ===");
        System.out.println("  药品ID: 9999（不存在）");
        System.out.println("  生成日志数: " + createdLogs.size());
        System.out.println("  ✅ 药品不存在时正确处理！");
    }
}
