-- 智药伴测试数据导入脚本
-- 用于 SMS 和 Push 功能端到端测试
-- 使用前请确保数据库已创建：CREATE DATABASE zhiyaoban CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE zhiyaoban;

-- 清理现有测试数据（按依赖顺序）
DELETE FROM reminder_logs WHERE user_id IN (1001, 1002, 2001);
DELETE FROM push_subscriptions WHERE user_id IN (1001, 1002, 2001);
DELETE FROM family_bindings WHERE elder_user_id IN (1001, 1002) OR family_user_id IN (1001, 1002);
DELETE FROM check_ins WHERE user_id IN (1001, 1002);
DELETE FROM medicines WHERE user_id IN (1001, 1002);
DELETE FROM users WHERE id IN (1001, 1002, 2001);
DELETE FROM sms_codes WHERE phone IN ('13800138001', '13800138002', '13900139001');

-- 重置自增ID起始值（可选，确保ID连续）
-- ALTER TABLE users AUTO_INCREMENT = 1001;
-- ALTER TABLE medicines AUTO_INCREMENT = 3001;

-- ==================== 插入测试用户 ====================
INSERT INTO users (id, phone, password_hash, name, role, created_at, updated_at) VALUES
(1001, '13800138001', NULL, '测试老人1', 'ELDER', NOW(), NOW()),
(1002, '13800138002', NULL, '测试老人2', 'ELDER', NOW(), NOW()),
(2001, '13900139001', NULL, '测试家属1', 'FAMILY', NOW(), NOW());

-- ==================== 插入测试药品 ====================
INSERT INTO medicines (id, user_id, name, dose, time, frequency, stock, icon, created_at, updated_at) VALUES
(3001, 1001, '硝苯地平控释片', '30mg', '08:00', 'daily', 3, '💊', NOW(), NOW()),
(3002, 1001, '阿司匹林肠溶片', '100mg', '08:00', 'daily', 10, '💊', NOW(), NOW()),
(3003, 1002, '二甲双胍片', '500mg', '07:00', 'daily', 1, '💊', NOW(), NOW());

-- ==================== 插入家属绑定关系 ====================
INSERT INTO family_bindings (elder_user_id, family_user_id, relation, status, created_at, updated_at) VALUES
(1001, 2001, '子女', 'ACTIVE', NOW(), NOW());

-- ==================== 插入推送订阅（模拟 Web Push 订阅数据）====================
INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, created_at, updated_at) VALUES
(1001, 'https://example.com/push/1001', 'BNcRdreALRsFltevg7GoFranzDVi5_ibobIZf7LWGr-sxu2PyzGf3Ui8iZ3X7EIQh6e1X3T8', 'test-auth-1001', NOW(), NOW()),
(1002, 'https://example.com/push/1002', 'BNcRdreALRsFltevg7GoFranzDVi5_ibobIZf7LWGr-sxu2PyzGf3Ui8iZ3X7EIQh6e1X3T9', 'test-auth-1002', NOW(), NOW());

-- ==================== 插入打卡记录（部分药品已打卡）====================
-- 1001用户今日已服用硝苯地平
INSERT INTO check_ins (user_id, medicine_id, date, taken_at, dose, created_at) VALUES
(1001, 3001, CURDATE(), NOW(), '30mg', NOW());

-- 1001用户的阿司匹林(3002)今日未打卡，可用于测试漏服提醒
-- 1002用户的二甲双胍(3003)今日未打卡，库存仅1，可用于测试库存提醒

-- ==================== 插入提醒计划（用于测试触发逻辑）====================
INSERT INTO reminder_schedules (user_id, name, type, enabled, advance_minutes, repeat_count, repeat_interval_minutes, channel, quiet_hours_start, quiet_hours_end, week_days, start_date, end_date, created_at, updated_at) VALUES
(1001, '早晨用药提醒', 'MEDICINE', 1, 0, 1, 30, 'PUSH', NULL, NULL, NULL, CURDATE(), NULL, NOW(), NOW()),
(1001, '库存不足提醒', 'STOCK', 1, 0, 1, 60, 'PUSH', NULL, NULL, NULL, CURDATE(), NULL, NOW(), NOW()),
(1001, '漏服提醒', 'MISSED', 1, 30, 2, 15, 'SMS', '22:00', '07:00', NULL, CURDATE(), NULL, NOW(), NOW()),
(1002, '早晨用药提醒', 'MEDICINE', 1, 0, 1, 30, 'PUSH', NULL, NULL, NULL, CURDATE(), NULL, NOW(), NOW()),
(1002, '库存不足提醒', 'STOCK', 1, 0, 1, 60, 'SMS', NULL, NULL, NULL, CURDATE(), NULL, NOW(), NOW());

-- ==================== 插入提醒日志（测试去重逻辑）====================
-- 今天08:00的硝苯地平用药提醒已发送（用于测试去重）
INSERT INTO reminder_logs (user_id, medicine_id, date, type, channel, sent_at, status, title, content, created_at) VALUES
(1001, 3001, CURDATE(), 'DUE', 'PUSH', CONCAT(CURDATE(), ' 08:00:00'), 'SUCCESS', '用药提醒', '您需要在 08:00 服用 硝苯地平控释片 30mg', CONCAT(CURDATE(), ' 08:00:00'));

-- ==================== 验证数据 ====================
SELECT '=== 用户 ===' AS info;
SELECT id, phone, name, role FROM users WHERE id IN (1001, 1002, 2001);

SELECT '=== 药品 ===' AS info;
SELECT id, user_id, name, dose, time, stock FROM medicines WHERE user_id IN (1001, 1002);

SELECT '=== 家属绑定 ===' AS info;
SELECT f.id, e.name AS elder_name, f.family_user_id, f.relation, f.status
FROM family_bindings f
JOIN users e ON f.elder_user_id = e.id
WHERE f.elder_user_id IN (1001, 1002);

SELECT '=== 推送订阅 ===' AS info;
SELECT user_id, endpoint, LEFT(p256dh, 20) AS p256dh_prefix FROM push_subscriptions WHERE user_id IN (1001, 1002);

SELECT '=== 今日打卡 ===' AS info;
SELECT c.id, c.user_id, c.medicine_id, m.name AS medicine_name, c.date, c.taken_at
FROM check_ins c
JOIN medicines m ON c.medicine_id = m.id
WHERE c.date = CURDATE();

SELECT '=== 提醒计划 ===' AS info;
SELECT id, user_id, name, type, channel, enabled FROM reminder_schedules WHERE user_id IN (1001, 1002);

SELECT '=== 提醒日志（今日）===' AS info;
SELECT id, user_id, medicine_id, type, channel, status, created_at FROM reminder_logs WHERE date = CURDATE();
