package com.zhiyaoban.controller;

import com.zhiyaoban.dto.ApiResult;
import com.zhiyaoban.entity.User;
import com.zhiyaoban.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 报告生成接口
 */
@RestController
@RequestMapping("/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    /**
     * 生成中期汇报报告
     */
    @PostMapping("/generate")
    public ApiResult<Map<String, String>> generate() {
        String path = reportService.generateReport();
        return ApiResult.ok(Map.of("path", path));
    }

    /**
     * 获取报告生成状态
     */
    @GetMapping("/status")
    public ApiResult<Map<String, Object>> getStatus() {
        // 简化实现，实际应返回真实状态
        return ApiResult.ok(Map.of(
            "status", "READY",
            "message", "报告服务已就绪"
        ));
    }
}
