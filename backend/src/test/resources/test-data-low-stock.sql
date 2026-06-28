-- ============================================
-- 提醒功能测试数据 - 库存不足场景
-- ============================================

-- 1. 创建测试用户（老人）
INSERT INTO users (id, phone, name, role, created_at, updated_at)
VALUES (1001, '13800001001', '测试老人-库存', 'ELDER', NOW(), NOW())
ON DUPLICATE KEY UPDATE phone = phone;

-- 2. 创建测试药品（库存不足：设置为3盒，低于阈值5）
INSERT INTO medicines (id, user_id, name, dose, time, frequency, stock, icon, created_at, updated_at)
VALUES (1001, 1001, '阿司匹林肠溶片', '100mg', '08:00', 'DAILY', 3, '💊', NOW(), NOW())
ON DUPLICATE KEY UPDATE stock = 3;

INSERT INTO medicines (id, user_id, name, dose, time, frequency, stock, icon, created_at, updated_at)
VALUES (1002, 1001, '布洛芬缓释胶囊', '200mg', '12:00', 'DAILY', 2, '💊', NOW(), NOW())
ON DUPLICATE KEY UPDATE stock = 2;

-- 3. 创建库存不足提醒计划
INSERT INTO reminder_schedules (id, user_id, name, type, enabled, advance_minutes, repeat_count, repeat_interval_minutes, channel, created_at, updated_at)
VALUES (1001, 1001, '库存不足提醒', 'STOCK', true, 0, 1, 30, 'PUSH', NOW(), NOW())
ON DUPLICATE KEY UPDATE name = '库存不足提醒';

-- 4. 将药品关联到提醒计划
INSERT INTO medicine_reminders (id, schedule_id, medicine_id, remind_time, dose, enabled, created_at, updated_at)
VALUES (1001, 1001, 1001, '09:00', '100mg', true, NOW(), NOW())
ON DUPLICATE KEY UPDATE remind_time = '09:00';

INSERT INTO medicine_reminders (id, schedule_id, medicine_id, remind_time, dose, enabled, created_at, updated_at)
VALUES (1002, 1001, 1002, '13:00', '200mg', true, NOW(), NOW())
ON DUPLICATE KEY UPDATE remind_time = '13:00';
