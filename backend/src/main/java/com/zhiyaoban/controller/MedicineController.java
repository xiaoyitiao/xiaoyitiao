package com.zhiyaoban.controller;

import com.zhiyaoban.dto.ApiResult;
import com.zhiyaoban.dto.MedicineDto;
import com.zhiyaoban.entity.MedicineFrequency;
import com.zhiyaoban.entity.User;
import com.zhiyaoban.service.MedicineService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 药品管理接口
 * 所有接口需要登录，且只能操作自己的药品
 */
@RestController
@RequestMapping("/medicines")
@RequiredArgsConstructor
public class MedicineController {

    private final MedicineService medicineService;

    /**
     * 获取用户所有药品
     */
    @GetMapping
    public ApiResult<List<MedicineDto>> list(@AuthenticationPrincipal User user) {
        return ApiResult.ok(medicineService.listByUser(user.getId()));
    }

    /**
     * 获取单个药品详情
     */
    @GetMapping("/{id}")
    public ApiResult<MedicineDto> get(@PathVariable Long id, @AuthenticationPrincipal User user) {
        return ApiResult.ok(medicineService.getById(id, user.getId()));
    }

    /**
     * 创建药品
     */
    @PostMapping
    public ApiResult<MedicineDto> save(@RequestBody @Valid MedicineDto dto, @AuthenticationPrincipal User user) {
        return ApiResult.ok(medicineService.save(dto, user.getId()));
    }

    /**
     * 更新药品
     */
    @PutMapping("/{id}")
    public ApiResult<MedicineDto> update(@PathVariable Long id, @RequestBody @Valid MedicineDto dto, @AuthenticationPrincipal User user) {
        dto.setId(id);
        return ApiResult.ok(medicineService.save(dto, user.getId()));
    }

    /**
     * 删除药品
     */
    @DeleteMapping("/{id}")
    public ApiResult<Void> delete(@PathVariable Long id, @AuthenticationPrincipal User user) {
        medicineService.delete(id, user.getId());
        return ApiResult.ok();
    }

    /**
     * 批量删除药品
     */
    @DeleteMapping("/batch")
    public ApiResult<Void> deleteBatch(@RequestBody Map<String, List<Long>> request, @AuthenticationPrincipal User user) {
        List<Long> ids = request.get("ids");
        if (ids != null && !ids.isEmpty()) {
            medicineService.deleteBatch(ids, user.getId());
        }
        return ApiResult.ok();
    }

    /**
     * 搜索药品
     */
    @GetMapping("/search")
    public ApiResult<List<MedicineDto>> search(
            @RequestParam String keyword,
            @AuthenticationPrincipal User user) {
        return ApiResult.ok(medicineService.searchByName(user.getId(), keyword));
    }

    /**
     * 按频率筛选药品
     */
    @GetMapping("/filter")
    public ApiResult<List<MedicineDto>> filterByFrequency(
            @RequestParam String frequency,
            @AuthenticationPrincipal User user) {
        MedicineFrequency freq = MedicineFrequency.valueOf(frequency);
        return ApiResult.ok(medicineService.filterByFrequency(user.getId(), freq));
    }

    /**
     * 获取库存不足的药品
     */
    @GetMapping("/low-stock")
    public ApiResult<List<MedicineDto>> getLowStock(
            @RequestParam(defaultValue = "10") int threshold,
            @AuthenticationPrincipal User user) {
        return ApiResult.ok(medicineService.getLowStockMedicines(user.getId(), threshold));
    }

    /**
     * 更新药品库存
     */
    @PutMapping("/{id}/stock")
    public ApiResult<Void> updateStock(
            @PathVariable Long id,
            @RequestBody Map<String, Integer> request,
            @AuthenticationPrincipal User user) {
        Integer stock = request.get("stock");
        if (stock != null) {
            medicineService.updateStock(id, user.getId(), stock);
        }
        return ApiResult.ok();
    }

    /**
     * 增加药品库存
     */
    @PostMapping("/{id}/stock/add")
    public ApiResult<Void> addStock(
            @PathVariable Long id,
            @RequestBody Map<String, Integer> request,
            @AuthenticationPrincipal User user) {
        Integer amount = request.get("amount");
        if (amount != null) {
            medicineService.increaseStock(id, user.getId(), amount);
        }
        return ApiResult.ok();
    }
}
