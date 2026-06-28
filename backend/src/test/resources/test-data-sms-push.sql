-- 测试数据：SMS 和 Push 功能验证
-- 使用 H2 数据库或 MySQL 均可

-- 清理现有测试数据
DELETE FROM reminder_logs WHERE user_id IN (1001, 1002, 2001);
DELETE FROM push_subscriptions WHERE user_id IN (1001, 1002, 2001);
DELETE FROM family_bindings WHERE elder_user_id IN (1001, 1002) OR family_user_id IN (1001, 1002);
DELETE FROM check_ins WHERE user_id IN (1001, 1002);
DELETE FROM medicines WHERE user_id IN (1001, 1002);
DELETE FROM users WHERE id IN (1001, 1002, 2001);

-- 插入测试用户
INSERT INTO users (id, phone, password_hash, name, role, created_at, updated_at) VALUES
(1001, '13800138001', NULL, '测试老人1', 'ELDER', NOW(), NOW()),
(1002, '13800138002', NULL, '测试老人2', 'ELDER', NOW(), NOW()),
(2001, '13900139001', NULL, '测试家属1', 'FAMILY', NOW(), NOW());

-- 插入测试药品
INSERT INTO medicines (id, user_id, name, dose, time, frequency, stock, icon, created_at, updated_at) VALUES
(3001, 1001, '硝苯地平控释片', '30mg', '08:00', 'daily', 3, '💊', NOW(), NOW()),
(3002, 1001, '阿司匹林肠溶片', '100mg', '08:00', 'daily', 10, '💊', NOW(), NOW()),
(3003, 1002, '二甲双胍片', '500mg', '07:00', 'daily', 1, '💊', NOW(), NOW());

-- 插入家属绑定关系
INSERT INTO family_bindings (elder_user_id, family_user_id, relation, status, created_at, updated_at) VALUES
(1001, 2001, '子女', 'ACTIVE', NOW(), NOW());

-- 插入推送订阅（模拟 Web Push 订阅数据）
INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, created_at, updated_at) VALUES
(1001, 'https://example.com/push/1001', 'test-p256dh-1001', 'test-auth-1001', NOW(), NOW()),
(1002, 'https://example.com/push/1002', 'test-p256dh-1002', 'test-auth-1002', NOW(), NOW());

-- 插入打卡记录（部分药品已打卡）
INSERT INTO check_ins (user_id, medicine_id, date, taken_at, dose, created_at) VALUES
(1001, 3001, CURRENT_DATE, NOW(), '30mg', NOW());
-- 注意：3002（阿司匹林）今日未打卡，可用于测试漏服提醒

-- 插入提醒日志（测试去重逻辑）
INSERT INTO reminder_logs (user_id, medicine_id, date, type, channel, status, title, content, created_at) VALUES
(1001, 3001, CURRENT_DATE, 'DUE', 'PUSH', 'SUCCESS', '用药提醒', '您需要在 08:00 服用 硝苯地平控释片 30mg', NOW());
-- 注意：今天 08:00 的 DUE 提醒已发送，用于测试去重

-- 验证查询
SELECT '=== 用户 ===' as info;
SELECT * FROM users WHERE id IN (1001, 1002, 2001);

SELECT '=== 药品 ===' as info;
SELECT * FROM medicines WHERE user_id IN (1001, 1002);

SELECT '=== 家属绑定 ===' as info;
SELECT * FROM family_bindings;

SELECT '=== 推送订阅 ===' as info;
SELECT * FROM push_subscriptions WHERE user_id IN (1001, 1002);

SELECT '=== 今日打卡 ===' as info;
SELECT * FROM check_ins WHERE date = CURRENT_DATE;

SELECT '=== 提醒日志（今日）===' as info;
SELECT * FROM reminder_logs WHERE date = CURRENT_DATE;
