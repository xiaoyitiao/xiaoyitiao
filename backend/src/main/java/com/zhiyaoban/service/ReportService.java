package com.zhiyaoban.service;

import com.zhiyaoban.config.ReportConfig;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * 报告生成服务
 * 定时调用 Python 脚本生成中期汇报 docx
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReportService {

    private final ReportConfig reportConfig;

    @PostConstruct
    public void init() throws IOException {
        Path outputDir = Paths.get(reportConfig.getOutputDir());
        if (!Files.exists(outputDir)) {
            Files.createDirectories(outputDir);
        }
    }

    /**
     * 每天凌晨 2 点自动生成报告
     */
    @Scheduled(cron = "0 0 2 * * ?")
    public void generateDailyReport() {
        generateReport();
    }

    public String generateReport() {
        String pythonPath = reportConfig.getPythonPath();
        String scriptPath = reportConfig.getScriptPath();
        String outputDir = reportConfig.getOutputDir();

        ProcessBuilder pb = new ProcessBuilder(pythonPath, scriptPath);
        pb.directory(new File("."));
        pb.inheritIO();

        try {
            Process process = pb.start();
            int exitCode = process.waitFor();
            if (exitCode != 0) {
                throw new RuntimeException("Python 脚本执行失败，退出码：" + exitCode);
            }

            // 脚本默认生成在当前目录：新闻2班_小组一_实践二中期汇报.docx
            String defaultName = "新闻2班_小组一_实践二中期汇报.docx";
            Path source = Paths.get(defaultName);
            if (!Files.exists(source)) {
                throw new RuntimeException("Python 脚本未生成报告文件：" + defaultName);
            }

            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            String targetName = "中期汇报_" + timestamp + ".docx";
            Path target = Paths.get(outputDir, targetName);
            Files.move(source, target, StandardCopyOption.REPLACE_EXISTING);

            log.info("报告已生成：{}", target.toAbsolutePath());
            return target.toString();
        } catch (IOException | InterruptedException e) {
            log.error("生成报告失败", e);
            throw new RuntimeException("生成报告失败：" + e.getMessage());
        }
    }
}
