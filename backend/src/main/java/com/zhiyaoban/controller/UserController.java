package com.zhiyaoban.controller;

import com.zhiyaoban.dto.ApiResult;
import com.zhiyaoban.entity.User;
import com.zhiyaoban.repository.UserRepository;
import com.zhiyaoban.service.MedicineService;
import com.zhiyaoban.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 用户信息接口
 */
@RestController
@RequestMapping("/user")
@RequiredArgsConstructor
public class UserController {

    private final MedicineService medicineService;
    private final UserRepository userRepository;
    private final AuthService authService;

    /**
     * 获取当前用户信息
     */
    @GetMapping("/me")
    public ApiResult<Map<String, Object>> me(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ApiResult.error(401, "未登录");
        }
        return ApiResult.ok(Map.of(
            "userId", user.getId(),
            "phone", user.getPhone(),
            "name", user.getName(),
            "role", user.getRole().name(),
            "createdAt", user.getCreatedAt()
        ));
    }

    /**
     * 更新用户信息
     */
    @PutMapping("/profile")
    public ApiResult<Map<String, Object>> updateProfile(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, String> request) {
        if (user == null) {
            return ApiResult.error(401, "未登录");
        }

        User currentUser = userRepository.findById(user.getId())
            .orElseThrow(() -> new RuntimeException("用户不存在"));

        if (request.containsKey("name")) {
            currentUser.setName(request.get("name"));
        }

        User savedUser = userRepository.save(currentUser);

        return ApiResult.ok(Map.of(
            "userId", savedUser.getId(),
            "phone", savedUser.getPhone(),
            "name", savedUser.getName(),
            "role", savedUser.getRole().name()
        ));
    }

    /**
     * 刷新Token
     */
    @PostMapping("/refresh-token")
    public ApiResult<Map<String, Object>> refreshToken(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ApiResult.error(401, "未登录");
        }
        var tokenResponse = authService.refreshToken(user);
        return ApiResult.ok(Map.of(
            "token", tokenResponse.getToken(),
            "expiresIn", tokenResponse.getExpiresIn()
        ));
    }

    /**
     * 获取用户统计信息
     */
    @GetMapping("/statistics")
    public ApiResult<Map<String, Object>> getStatistics(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ApiResult.error(401, "未登录");
        }

        Map<String, Object> stats = new HashMap<>();
        
        // 药品数量
        stats.put("medicineCount", medicineService.listByUser(user.getId()).size());
        
        // 今日打卡数量
        LocalDate today = LocalDate.now();
        stats.put("todayCheckInCount", 0); // 将在CheckInService中完善
        
        // 库存预警数量
        stats.put("lowStockCount", medicineService.getLowStockMedicines(user.getId(), 10).size());
        
        return ApiResult.ok(stats);
    }

    /**
     * 根据手机号查询用户（用于家属绑定）
     */
    @GetMapping("/search")
    public ApiResult<List<Map<String, Object>>> searchUsers(
            @AuthenticationPrincipal User user,
            @RequestParam String keyword) {
        if (user == null) {
            return ApiResult.error(401, "未登录");
        }

        List<User> users = userRepository.findByNameContainingIgnoreCase(keyword);
        
        return ApiResult.ok(users.stream()
            .map(u -> Map.<String, Object>of(
                "userId", u.getId(),
                "phone", u.getPhone(),
                "name", u.getName(),
                "role", u.getRole().name()
            ))
            .collect(Collectors.toList()));
    }
}
