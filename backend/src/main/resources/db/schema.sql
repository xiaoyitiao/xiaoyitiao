-- 智药伴 MySQL 数据库建表语句
-- 字符集推荐 utf8mb4，支持 emoji 图标存储
-- 创建数据库：CREATE DATABASE zhiyaoban CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `users` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '用户ID',
    `phone` VARCHAR(20) NOT NULL COMMENT '手机号，登录账号',
    `password_hash` VARCHAR(255) DEFAULT NULL COMMENT '密码哈希（验证码登录模式下可为空）',
    `name` VARCHAR(50) DEFAULT NULL COMMENT '用户昵称/姓名',
    `role` VARCHAR(20) NOT NULL DEFAULT 'ELDER' COMMENT '角色：ELDER 老人，FAMILY 家属，ADMIN 管理员',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_phone` (`phone`),
    KEY `idx_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

CREATE TABLE IF NOT EXISTS `medicines` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '药品ID',
    `user_id` BIGINT NOT NULL COMMENT '所属老人用户ID',
    `name` VARCHAR(100) NOT NULL COMMENT '药品名称',
    `dose` VARCHAR(50) DEFAULT NULL COMMENT '每次剂量',
    `actual_dose` VARCHAR(50) DEFAULT NULL COMMENT '实际服用剂量',
    `time` VARCHAR(10) NOT NULL COMMENT '服药时间 HH:MM',
    `frequency` VARCHAR(20) NOT NULL DEFAULT 'daily' COMMENT '频率：daily/weekly/once/interval/custom',
    `week_days` VARCHAR(50) DEFAULT NULL COMMENT '每周哪几天，逗号分隔 0-6',
    `interval_days` INT DEFAULT 1 COMMENT '间隔天数',
    `start_date` DATE DEFAULT NULL COMMENT '开始日期',
    `end_date` DATE DEFAULT NULL COMMENT '结束日期',
    `stock` INT DEFAULT 0 COMMENT '库存',
    `note` VARCHAR(255) DEFAULT NULL COMMENT '备注',
    `icon` VARCHAR(20) DEFAULT '💊' COMMENT '图标',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_time` (`time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='药品表';

CREATE TABLE IF NOT EXISTS `check_ins` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '打卡ID',
    `user_id` BIGINT NOT NULL COMMENT '用户ID',
    `medicine_id` BIGINT NOT NULL COMMENT '药品ID',
    `date` DATE NOT NULL COMMENT '打卡日期',
    `taken_at` DATETIME NOT NULL COMMENT '实际打卡时间',
    `dose` VARCHAR(50) DEFAULT NULL COMMENT '实际服用剂量',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_med_date` (`user_id`, `medicine_id`, `date`),
    KEY `idx_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用药打卡记录表';

CREATE TABLE IF NOT EXISTS `family_bindings` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '绑定ID',
    `elder_user_id` BIGINT NOT NULL COMMENT '老人用户ID',
    `family_user_id` BIGINT NOT NULL COMMENT '家属用户ID',
    `relation` VARCHAR(20) DEFAULT NULL COMMENT '关系：子女/配偶/其他',
    `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' COMMENT '状态：ACTIVE/INACTIVE',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_elder_family` (`elder_user_id`, `family_user_id`),
    KEY `idx_family_user_id` (`family_user_id`),
    KEY `idx_elder_user_id` (`elder_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='家人绑定关系表';

CREATE TABLE IF NOT EXISTS `reminder_logs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '日志ID',
    `user_id` BIGINT NOT NULL COMMENT '用户ID',
    `medicine_id` BIGINT NOT NULL COMMENT '药品ID',
    `date` DATE NOT NULL COMMENT '提醒日期',
    `type` VARCHAR(20) NOT NULL COMMENT '类型：DUE 到点提醒 / MISSED 漏服提醒',
    `channel` VARCHAR(20) NOT NULL DEFAULT 'PUSH' COMMENT '通道：PUSH 推送 / SMS 短信 / CALL 电话 / IN_APP 应用内',
    `sent_at` DATETIME DEFAULT NULL COMMENT '发送时间',
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING' COMMENT '状态：PENDING/SUCCESS/FAILED',
    `error_msg` VARCHAR(500) DEFAULT NULL COMMENT '失败原因',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_user_date` (`user_id`, `date`),
    KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='提醒发送日志表';

CREATE TABLE IF NOT EXISTS `push_subscriptions` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '订阅ID',
    `user_id` BIGINT NOT NULL COMMENT '用户ID',
    `endpoint` VARCHAR(512) NOT NULL COMMENT '推送端点',
    `p256dh` VARCHAR(255) NOT NULL COMMENT '公钥',
    `auth` VARCHAR(255) NOT NULL COMMENT '鉴权密钥',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_endpoint` (`user_id`, `endpoint`(255)),
    KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Web Push 订阅表';

CREATE TABLE IF NOT EXISTS `sms_codes` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT 'ID',
    `phone` VARCHAR(20) NOT NULL COMMENT '手机号',
    `code` VARCHAR(10) NOT NULL COMMENT '验证码',
    `used` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已使用',
    `attempt_count` INT NOT NULL DEFAULT 0 COMMENT '尝试次数（用于防止暴力破解）',
    `expire_at` DATETIME NOT NULL COMMENT '过期时间',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_phone` (`phone`),
    KEY `idx_expire_at` (`expire_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='短信验证码表';

-- ============================================
-- 提醒功能模块表结构
-- ============================================

/**
 * 提醒计划表
 * 存储用户设置的提醒规则配置
 */
CREATE TABLE IF NOT EXISTS `reminder_schedules` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '提醒计划ID',
    `user_id` BIGINT NOT NULL COMMENT '所属用户ID',
    `name` VARCHAR(100) NOT NULL COMMENT '提醒计划名称，如"早晨用药提醒"',
    `type` VARCHAR(20) NOT NULL COMMENT '提醒类型：MEDICINE用药提醒 / MISSED漏服提醒 / STOCK库存不足提醒',
    `enabled` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用：1启用 0禁用',
    `advance_minutes` INT NOT NULL DEFAULT 0 COMMENT '提前提醒分钟数',
    `repeat_count` INT NOT NULL DEFAULT 1 COMMENT '重复提醒次数',
    `repeat_interval_minutes` INT NOT NULL DEFAULT 30 COMMENT '重复提醒间隔分钟数',
    `channel` VARCHAR(20) NOT NULL DEFAULT 'PUSH' COMMENT '提醒渠道：PUSH推送 / SMS短信 / CALL电话',
    `quiet_hours_start` TIME DEFAULT NULL COMMENT '免打扰开始时间',
    `quiet_hours_end` TIME DEFAULT NULL COMMENT '免打扰结束时间',
    `week_days` VARCHAR(50) DEFAULT NULL COMMENT '每周哪几天生效，逗号分隔 0-6，NULL表示每天',
    `start_date` DATE DEFAULT NULL COMMENT '计划开始日期，NULL表示立即生效',
    `end_date` DATE DEFAULT NULL COMMENT '计划结束日期，NULL表示永久有效',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_type_enabled` (`type`, `enabled`),
    KEY `idx_user_enabled` (`user_id`, `enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='提醒计划表';

/**
 * 药品提醒关联表
 * 将药品与提醒计划关联，支持一个药品多个提醒时间
 */
CREATE TABLE IF NOT EXISTS `medicine_reminders` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '关联ID',
    `schedule_id` BIGINT NOT NULL COMMENT '提醒计划ID',
    `medicine_id` BIGINT NOT NULL COMMENT '药品ID',
    `remind_time` TIME NOT NULL COMMENT '提醒时间 HH:MM',
    `dose` VARCHAR(50) DEFAULT NULL COMMENT '提醒剂量',
    `enabled` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_schedule_medicine_time` (`schedule_id`, `medicine_id`, `remind_time`),
    KEY `idx_medicine_id` (`medicine_id`),
    KEY `idx_schedule_id` (`schedule_id`),
    KEY `idx_medicine_remind_time` (`medicine_id`, `remind_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='药品提醒关联表';

/**
 * 提醒发送日志表（扩展已有reminder_logs）
 * 记录每次提醒发送的详细信息
 */
ALTER TABLE `reminder_logs` 
    ADD COLUMN IF NOT EXISTS `schedule_id` BIGINT DEFAULT NULL COMMENT '关联的提醒计划ID' AFTER `medicine_id`,
    ADD COLUMN IF NOT EXISTS `family_user_id` BIGINT DEFAULT NULL COMMENT '收到通知的家属用户ID' AFTER `schedule_id`,
    ADD COLUMN IF NOT EXISTS `title` VARCHAR(100) DEFAULT NULL COMMENT '通知标题' AFTER `family_user_id`,
    ADD COLUMN IF NOT EXISTS `content` VARCHAR(500) DEFAULT NULL COMMENT '通知内容' AFTER `title`,
    ADD COLUMN IF NOT EXISTS `retry_count` INT NOT NULL DEFAULT 0 COMMENT '重试次数' AFTER `error_msg`,
    ADD COLUMN IF NOT EXISTS `read_at` DATETIME DEFAULT NULL COMMENT '用户查看时间' AFTER `retry_count`;

CREATE INDEX IF NOT EXISTS `idx_reminder_logs_schedule` ON `reminder_logs` (`schedule_id`);
CREATE INDEX IF NOT EXISTS `idx_reminder_logs_family` ON `reminder_logs` (`family_user_id`);

