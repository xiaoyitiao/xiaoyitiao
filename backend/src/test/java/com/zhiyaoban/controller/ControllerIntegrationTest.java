package com.zhiyaoban.controller;

import com.zhiyaoban.dto.*;
import com.zhiyaoban.entity.*;
import com.zhiyaoban.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * 控制器接口测试
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
public class ControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MedicineRepository medicineRepository;

    @Autowired
    private CheckInRepository checkInRepository;

    @Autowired
    private FamilyBindingRepository familyBindingRepository;

    @Autowired
    private SmsCodeRepository smsCodeRepository;

    private User testUser;
    private String authToken;

    @BeforeEach
    public void setUp() {
        // 创建测试用户
        testUser = new User();
        testUser.setPhone("13800138000");
        testUser.setName("测试用户");
        testUser.setRole(UserRole.ELDER);
        testUser = userRepository.save(testUser);

        // 创建测试验证码
        SmsCode smsCode = new SmsCode();
        smsCode.setPhone("13800138000");
        smsCode.setCode("123456");
        smsCode.setUsed(false);
        smsCode.setExpireAt(LocalDateTime.now().plusMinutes(5));
        smsCodeRepository.save(smsCode);

        // 创建测试药品
        Medicine medicine = new Medicine();
        medicine.setUserId(testUser.getId());
        medicine.setName("阿司匹林");
        medicine.setDose("100mg");
        medicine.setTime("08:00");
        medicine.setFrequency(MedicineFrequency.DAILY);
        medicine.setStock(30);
        medicineRepository.save(medicine);
    }

    @Test
    public void testAuthEndpoints() throws Exception {
        // 测试发送验证码
        mockMvc.perform(post("/api/auth/send-code")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"phone\": \"13800138000\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200));

        // 测试登录
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"phone\": \"13800138000\", \"code\": \"123456\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.token").exists());
    }

    @Test
    public void testUserEndpoints() throws Exception {
        // 测试获取当前用户信息
        mockMvc.perform(get("/api/user/me")
                .header("Authorization", "Bearer test-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.phone").value("13800138000"));

        // 测试更新用户信息
        mockMvc.perform(put("/api/user/profile")
                .header("Authorization", "Bearer test-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\": \"新名称\"}"))
            .andExpect(status().isOk());
    }

    @Test
    public void testMedicineEndpoints() throws Exception {
        // 测试获取药品列表
        mockMvc.perform(get("/api/medicines")
                .header("Authorization", "Bearer test-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data").isArray());

        // 测试创建药品
        String medicineJson = String.format(
            "{\"name\": \"布洛芬\", \"dose\": \"200mg\", \"time\": \"12:00\", \"frequency\": \"DAILY\", \"stock\": 20}");
        mockMvc.perform(post("/api/medicines")
                .header("Authorization", "Bearer test-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content(medicineJson))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.name").value("布洛芬"));
    }

    @Test
    public void testCheckInEndpoints() throws Exception {
        String today = LocalDate.now().format(DateTimeFormatter.ISO_DATE);

        // 测试打卡
        String checkInJson = String.format(
            "{\"medicineId\": 1, \"date\": \"%s\"}", today);
        mockMvc.perform(post("/api/check-ins")
                .header("Authorization", "Bearer test-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content(checkInJson))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200));

        // 测试获取打卡列表
        mockMvc.perform(get("/api/check-ins")
                .param("date", today)
                .header("Authorization", "Bearer test-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    public void testScheduleEndpoints() throws Exception {
        String today = LocalDate.now().format(DateTimeFormatter.ISO_DATE);

        // 测试获取今日计划
        mockMvc.perform(get("/api/schedule/today")
                .param("date", today)
                .header("Authorization", "Bearer test-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.medicines").isArray())
            .andExpect(jsonPath("$.data.totalCount").exists());
    }

    @Test
    public void testFamilyEndpoints() throws Exception {
        // 创建第二个测试用户（老人）
        User elderUser = new User();
        elderUser.setPhone("13800138001");
        elderUser.setName("测试老人");
        elderUser.setRole(UserRole.ELDER);
        elderUser = userRepository.save(elderUser);

        // 测试绑定关系
        String bindJson = String.format(
            "{\"elderUserId\": %d, \"relation\": \"子女\"}", elderUser.getId());
        mockMvc.perform(post("/api/family/bind")
                .header("Authorization", "Bearer test-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content(bindJson))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200));

        // 测试获取绑定列表
        mockMvc.perform(get("/api/family/my-families")
                .header("Authorization", "Bearer test-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    public void testReminderEndpoints() throws Exception {
        // 测试获取订阅状态
        mockMvc.perform(get("/api/reminders/status")
                .header("Authorization", "Bearer test-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.hasSubscription").exists());
    }

    @Test
    public void testAiEndpoints() throws Exception {
        // 测试获取AI状态
        mockMvc.perform(get("/api/ai/status")
                .header("Authorization", "Bearer test-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.enabled").exists());
    }

    @Test
    public void testReportEndpoints() throws Exception {
        // 测试获取报告状态
        mockMvc.perform(get("/api/reports/status")
                .header("Authorization", "Bearer test-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.status").exists());
    }
}
