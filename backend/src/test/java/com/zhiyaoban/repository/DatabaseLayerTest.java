package com.zhiyaoban.repository;

import com.zhiyaoban.entity.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 数据库层功能测试
 */
@SpringBootTest
@Transactional
public class DatabaseLayerTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MedicineRepository medicineRepository;

    @Autowired
    private CheckInRepository checkInRepository;

    @Autowired
    private FamilyBindingRepository familyBindingRepository;

    @Autowired
    private ReminderLogRepository reminderLogRepository;

    @Autowired
    private PushSubscriptionRepository pushSubscriptionRepository;

    @Autowired
    private SmsCodeRepository smsCodeRepository;

    @Autowired
    private StatisticsRepository statisticsRepository;

    @Test
    public void testUserRepository() {
        // 创建测试用户
        User user = new User();
        user.setPhone("13800138000");
        user.setName("测试用户");
        user.setRole(UserRole.ELDER);
        User savedUser = userRepository.save(user);

        assertNotNull(savedUser.getId());
        assertEquals("13800138000", savedUser.getPhone());

        // 测试查询
        Optional<User> foundUser = userRepository.findByPhone("13800138000");
        assertTrue(foundUser.isPresent());
        assertEquals("测试用户", foundUser.get().getName());

        // 测试按角色查询
        List<User> elders = userRepository.findByRole(UserRole.ELDER);
        assertFalse(elders.isEmpty());

        // 测试手机号存在性检查
        assertTrue(userRepository.existsByPhone("13800138000"));
        assertFalse(userRepository.existsByPhone("13900139000"));
    }

    @Test
    public void testMedicineRepository() {
        // 先创建用户
        User user = new User();
        user.setPhone("13800138001");
        user.setRole(UserRole.ELDER);
        user = userRepository.save(user);

        // 创建药品
        Medicine medicine = new Medicine();
        medicine.setUserId(user.getId());
        medicine.setName("阿司匹林");
        medicine.setDose("100mg");
        medicine.setTime("08:00");
        medicine.setFrequency(MedicineFrequency.DAILY);
        medicine.setStock(30);
        Medicine savedMedicine = medicineRepository.save(medicine);

        assertNotNull(savedMedicine.getId());
        assertEquals("阿司匹林", savedMedicine.getName());

        // 测试查询
        List<Medicine> userMedicines = medicineRepository.findByUserId(user.getId());
        assertEquals(1, userMedicines.size());

        // 测试按时间排序查询
        List<Medicine> sortedMedicines = medicineRepository.findByUserIdOrderByTimeAsc(user.getId());
        assertFalse(sortedMedicines.isEmpty());

        // 测试库存查询
        List<Medicine> lowStockMedicines = medicineRepository.findByUserIdAndStockLessThanEqual(user.getId(), 50);
        assertFalse(lowStockMedicines.isEmpty());
    }

    @Test
    public void testCheckInRepository() {
        // 创建用户和药品
        User user = new User();
        user.setPhone("13800138002");
        user.setRole(UserRole.ELDER);
        user = userRepository.save(user);

        Medicine medicine = new Medicine();
        medicine.setUserId(user.getId());
        medicine.setName("测试药品");
        medicine.setTime("08:00");
        medicine.setFrequency(MedicineFrequency.DAILY);
        medicine = medicineRepository.save(medicine);

        // 创建打卡记录
        LocalDate today = LocalDate.now();
        CheckIn checkIn = new CheckIn();
        checkIn.setUserId(user.getId());
        checkIn.setMedicineId(medicine.getId());
        checkIn.setDate(today);
        checkIn.setTakenAt(LocalDateTime.now());
        checkIn.setDose("100mg");
        CheckIn savedCheckIn = checkInRepository.save(checkIn);

        assertNotNull(savedCheckIn.getId());
        assertEquals(today, savedCheckIn.getDate());

        // 测试查询
        List<CheckIn> todayCheckIns = checkInRepository.findByUserIdAndDateOrderByTakenAtDesc(user.getId(), today);
        assertEquals(1, todayCheckIns.size());

        // 测试唯一性查询
        Optional<CheckIn> foundCheckIn = checkInRepository.findByUserIdAndMedicineIdAndDate(
            user.getId(), medicine.getId(), today);
        assertTrue(foundCheckIn.isPresent());

        // 测试统计
        long count = checkInRepository.countByUserIdAndDate(user.getId(), today);
        assertEquals(1, count);
    }

    @Test
    public void testFamilyBindingRepository() {
        // 创建老人和家属
        User elder = new User();
        elder.setPhone("13800138003");
        elder.setRole(UserRole.ELDER);
        elder = userRepository.save(elder);

        User family = new User();
        family.setPhone("13800138004");
        family.setRole(UserRole.FAMILY);
        family = userRepository.save(family);

        // 创建绑定关系
        FamilyBinding binding = new FamilyBinding();
        binding.setElderUserId(elder.getId());
        binding.setFamilyUserId(family.getId());
        binding.setRelation("子女");
        binding.setStatus(BindingStatus.ACTIVE);
        FamilyBinding savedBinding = familyBindingRepository.save(binding);

        assertNotNull(savedBinding.getId());
        assertEquals("子女", savedBinding.getRelation());

        // 测试查询
        List<FamilyBinding> elderBindings = familyBindingRepository.findByElderUserIdAndStatus(
            elder.getId(), BindingStatus.ACTIVE);
        assertEquals(1, elderBindings.size());

        List<FamilyBinding> familyBindings = familyBindingRepository.findByFamilyUserIdAndStatus(
            family.getId(), BindingStatus.ACTIVE);
        assertEquals(1, familyBindings.size());

        // 测试唯一性查询
        Optional<FamilyBinding> foundBinding = familyBindingRepository.findByElderUserIdAndFamilyUserId(
            elder.getId(), family.getId());
        assertTrue(foundBinding.isPresent());

        // 测试存在性检查
        assertTrue(familyBindingRepository.existsByElderUserIdAndFamilyUserId(elder.getId(), family.getId()));
    }

    @Test
    public void testReminderLogRepository() {
        // 创建用户和药品
        User user = new User();
        user.setPhone("13800138005");
        user.setRole(UserRole.ELDER);
        user = userRepository.save(user);

        Medicine medicine = new Medicine();
        medicine.setUserId(user.getId());
        medicine.setName("测试药品");
        medicine.setTime("08:00");
        medicine.setFrequency(MedicineFrequency.DAILY);
        medicine = medicineRepository.save(medicine);

        // 创建提醒日志
        LocalDate today = LocalDate.now();
        ReminderLog log = new ReminderLog();
        log.setUserId(user.getId());
        log.setMedicineId(medicine.getId());
        log.setDate(today);
        log.setType(ReminderType.DUE);
        log.setChannel(ReminderChannel.PUSH);
        log.setStatus(ReminderStatus.PENDING);
        ReminderLog savedLog = reminderLogRepository.save(log);

        assertNotNull(savedLog.getId());
        assertEquals(ReminderType.DUE, savedLog.getType());

        // 测试查询
        Optional<ReminderLog> foundLog = reminderLogRepository.findByUserIdAndMedicineIdAndDateAndType(
            user.getId(), medicine.getId(), today, ReminderType.DUE);
        assertTrue(foundLog.isPresent());

        // 测试按状态查询
        List<ReminderLog> pendingLogs = reminderLogRepository.findByStatus(ReminderStatus.PENDING);
        assertFalse(pendingLogs.isEmpty());

        // 测试统计
        long count = reminderLogRepository.countByStatus(ReminderStatus.PENDING);
        assertTrue(count > 0);
    }

    @Test
    public void testPushSubscriptionRepository() {
        // 创建用户
        User user = new User();
        user.setPhone("13800138006");
        user.setRole(UserRole.ELDER);
        user = userRepository.save(user);

        // 创建推送订阅
        PushSubscription subscription = new PushSubscription();
        subscription.setUserId(user.getId());
        subscription.setEndpoint("https://fcm.googleapis.com/...");
        subscription.setP256dh("test_p256dh");
        subscription.setAuth("test_auth");
        PushSubscription savedSubscription = pushSubscriptionRepository.save(subscription);

        assertNotNull(savedSubscription.getId());
        assertEquals("https://fcm.googleapis.com/...", savedSubscription.getEndpoint());

        // 测试查询
        List<PushSubscription> userSubscriptions = pushSubscriptionRepository.findByUserId(user.getId());
        assertEquals(1, userSubscriptions.size());

        // 测试存在性检查
        assertTrue(pushSubscriptionRepository.existsByUserId(user.getId()));

        // 测试统计
        long count = pushSubscriptionRepository.countByUserId(user.getId());
        assertEquals(1, count);
    }

    @Test
    public void testSmsCodeRepository() {
        // 创建验证码
        LocalDateTime expireTime = LocalDateTime.now().plusMinutes(5);
        SmsCode smsCode = new SmsCode();
        smsCode.setPhone("13800138007");
        smsCode.setCode("123456");
        smsCode.setUsed(false);
        smsCode.setExpireAt(expireTime);
        SmsCode savedSmsCode = smsCodeRepository.save(smsCode);

        assertNotNull(savedSmsCode.getId());
        assertEquals("123456", savedSmsCode.getCode());

        // 测试查询
        Optional<SmsCode> foundCode = smsCodeRepository.findTopByPhoneAndUsedFalseAndExpireAtAfterOrderByCreatedAtDesc(
            "13800138007", LocalDateTime.now());
        assertTrue(foundCode.isPresent());
    }

    @Test
    public void testStatisticsRepository() {
        // 创建测试数据
        User user = new User();
        user.setPhone("13800138008");
        user.setName("统计测试用户");
        user.setRole(UserRole.ELDER);
        user = userRepository.save(user);

        Medicine medicine = new Medicine();
        medicine.setUserId(user.getId());
        medicine.setName("统计测试药品");
        medicine.setTime("08:00");
        medicine.setFrequency(MedicineFrequency.DAILY);
        medicine.setStock(5); // 低库存
        medicine = medicineRepository.save(medicine);

        // 创建打卡记录
        LocalDate today = LocalDate.now();
        CheckIn checkIn = new CheckIn();
        checkIn.setUserId(user.getId());
        checkIn.setMedicineId(medicine.getId());
        checkIn.setDate(today);
        checkIn.setTakenAt(LocalDateTime.now());
        checkInRepository.save(checkIn);

        // 测试统计查询
        LocalDate weekAgo = today.minusDays(7);
        Map<String, Object> stats = statisticsRepository.getUserMedicineStatistics(user.getId(), weekAgo, today);
        assertNotNull(stats);
        assertTrue(stats.containsKey("userId"));
        assertTrue(stats.containsKey("adherenceRate"));

        // 测试每日详情
        List<Map<String, Object>> dailyDetails = statisticsRepository.getUserDailyMedicineDetails(user.getId(), today);
        assertNotNull(dailyDetails);
        assertFalse(dailyDetails.isEmpty());

        // 测试低库存查询
        List<Medicine> lowStockMedicines = statisticsRepository.getLowStockMedicines(10);
        assertFalse(lowStockMedicines.isEmpty());

        // 测试依从性统计
        Map<String, Object> adherence = statisticsRepository.getUserMedicationAdherence(user.getId(), 7);
        assertNotNull(adherence);
        assertTrue(adherence.containsKey("consecutiveDays"));

        // 测试系统统计
        Map<String, Object> systemStats = statisticsRepository.getSystemStatistics();
        assertNotNull(systemStats);
        assertTrue(systemStats.containsKey("users"));
        assertTrue(systemStats.containsKey("medicines"));
    }

    @Test
    public void testEnumTypes() {
        // 测试枚举类型是否正确工作
        User user = new User();
        user.setPhone("13800138009");
        user.setRole(UserRole.ELDER);
        user = userRepository.save(user);

        Medicine medicine = new Medicine();
        medicine.setUserId(user.getId());
        medicine.setName("枚举测试药品");
        medicine.setTime("08:00");
        medicine.setFrequency(MedicineFrequency.WEEKLY);
        medicine = medicineRepository.save(medicine);

        // 验证枚举类型正确保存和读取
        Medicine foundMedicine = medicineRepository.findById(medicine.getId()).orElse(null);
        assertNotNull(foundMedicine);
        assertEquals(MedicineFrequency.WEEKLY, foundMedicine.getFrequency());

        // 测试其他枚举类型
        FamilyBinding binding = new FamilyBinding();
        binding.setElderUserId(user.getId());
        binding.setFamilyUserId(user.getId()); // 自绑定测试
        binding.setStatus(BindingStatus.PENDING);
        familyBindingRepository.save(binding);

        ReminderLog log = new ReminderLog();
        log.setUserId(user.getId());
        log.setMedicineId(medicine.getId());
        log.setDate(LocalDate.now());
        log.setType(ReminderType.MISSED);
        log.setChannel(ReminderChannel.SMS);
        log.setStatus(ReminderStatus.FAILED);
        reminderLogRepository.save(log);
    }

    @Test
    public void testValidationAnnotations() {
        // 测试验证注解（需要手动验证或集成测试）
        User user = new User();
        user.setPhone("13800138010");
        user.setName("验证测试用户");
        user.setRole(UserRole.ELDER);

        // 正常数据应该保存成功
        User savedUser = userRepository.save(user);
        assertNotNull(savedUser.getId());

        // 测试药品验证
        Medicine medicine = new Medicine();
        medicine.setUserId(user.getId());
        medicine.setName("验证测试药品");
        medicine.setTime("08:00");
        medicine.setFrequency(MedicineFrequency.DAILY);
        medicine.setStock(10);

        Medicine savedMedicine = medicineRepository.save(medicine);
        assertNotNull(savedMedicine.getId());
    }
}