package com.zhiyaoban;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * 智药伴后端启动类
 * 启用定时任务，用于后端轮询提醒
 */
@SpringBootApplication
@EnableScheduling
public class ZhiyaoBanApplication {
    public static void main(String[] args) {
        SpringApplication.run(ZhiyaoBanApplication.class, args);
    }
}
