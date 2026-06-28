package com.zhiyaoban.controller;

import com.zhiyaoban.dto.ApiResult;
import com.zhiyaoban.dto.FamilyBindRequest;
import com.zhiyaoban.dto.FamilyElderTodayDto;
import com.zhiyaoban.entity.User;
import com.zhiyaoban.service.FamilyService;
import com.zhiyaoban.service.FamilyService.FamilyTodayView;
import com.zhiyaoban.service.FamilyService.FamilyBindingDetail;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 家人绑定与远程查看接口
 */
@RestController
@RequestMapping("/family")
@RequiredArgsConstructor
public class FamilyController {

    private final FamilyService familyService;

    /**
     * 绑定老人和家属关系
     */
    @PostMapping("/bind")
    public ApiResult<Void> bind(@RequestBody @Valid FamilyBindRequest request, @AuthenticationPrincipal User familyUser) {
        familyService.bindFamily(request.getElderUserId(), familyUser.getId(), request.getRelation());
        return ApiResult.ok();
    }

    /**
     * 解除绑定关系
     */
    @DeleteMapping("/unbind/{bindingId}")
    public ApiResult<Void> unbind(@PathVariable Long bindingId, @AuthenticationPrincipal User user) {
        // 查找绑定关系并删除
        List<FamilyBindingDetail> bindings = familyService.getFamilyBindingDetails(user.getId(), user.getRole());
        for (FamilyBindingDetail binding : bindings) {
            if (binding.getBindingId().equals(bindingId)) {
                familyService.unbindFamily(binding.getUserId(), user.getId());
                return ApiResult.ok();
            }
        }
        return ApiResult.error(404, "绑定关系不存在");
    }

    /**
     * 获取家属绑定的所有老人
     */
    @GetMapping("/my-elders")
    public ApiResult<List<Map<String, Object>>> myElders(@AuthenticationPrincipal User familyUser) {
        List<Map<String, Object>> list = familyService.listMyElders(familyUser.getId()).stream()
            .map(u -> Map.<String, Object>of(
                "userId", u.getId(),
                "phone", u.getPhone(),
                "name", u.getName()
            )).collect(Collectors.toList());
        return ApiResult.ok(list);
    }

    /**
     * 获取老人绑定的所有家属
     */
    @GetMapping("/my-families")
    public ApiResult<List<Map<String, Object>>> myFamilies(@AuthenticationPrincipal User elderUser) {
        List<Map<String, Object>> list = familyService.listMyFamilies(elderUser.getId()).stream()
            .map(u -> Map.<String, Object>of(
                "userId", u.getId(),
                "phone", u.getPhone(),
                "name", u.getName()
            )).collect(Collectors.toList());
        return ApiResult.ok(list);
    }

    /**
     * 获取绑定关系详情
     */
    @GetMapping("/bindings")
    public ApiResult<List<FamilyBindingDetail>> getBindings(@AuthenticationPrincipal User user) {
        return ApiResult.ok(familyService.getFamilyBindingDetails(user.getId(), user.getRole()));
    }

    /**
     * 获取老人今日用药情况（供家属查看）
     */
    @GetMapping("/elder-today/{elderUserId}")
    public ApiResult<FamilyTodayView> elderToday(@PathVariable Long elderUserId, @AuthenticationPrincipal User familyUser) {
        if (!familyService.canViewElder(familyUser.getId(), elderUserId)) {
            return ApiResult.error(403, "无权限查看该老人");
        }
        return ApiResult.ok(familyService.getElderTodayView(elderUserId));
    }

    /**
     * 获取老人指定日期用药情况（供家属查看）
     */
    @GetMapping("/elder-date/{elderUserId}")
    public ApiResult<FamilyTodayView> elderDate(
            @PathVariable Long elderUserId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @AuthenticationPrincipal User familyUser) {
        if (!familyService.canViewElder(familyUser.getId(), elderUserId)) {
            return ApiResult.error(403, "无权限查看该老人");
        }
        return ApiResult.ok(familyService.getElderDateView(elderUserId, date));
    }

    /**
     * 检查是否有权限查看指定老人
     */
    @GetMapping("/can-view/{elderUserId}")
    public ApiResult<Map<String, Boolean>> canView(@PathVariable Long elderUserId, @AuthenticationPrincipal User familyUser) {
        boolean canView = familyService.canViewElder(familyUser.getId(), elderUserId);
        return ApiResult.ok(Map.of("canView", canView));
    }
}
