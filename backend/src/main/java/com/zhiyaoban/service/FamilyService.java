package com.zhiyaoban.service;

import com.zhiyaoban.dto.CheckInDto;
import com.zhiyaoban.dto.MedicineDto;
import com.zhiyaoban.entity.BindingStatus;
import com.zhiyaoban.entity.FamilyBinding;
import com.zhiyaoban.entity.User;
import com.zhiyaoban.entity.UserRole;
import com.zhiyaoban.repository.FamilyBindingRepository;
import com.zhiyaoban.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 家人绑定与查看服务
 */
@Service
@RequiredArgsConstructor
public class FamilyService {

    private final FamilyBindingRepository familyBindingRepository;
    private final UserRepository userRepository;
    private final MedicineService medicineService;
    private final CheckInService checkInService;

    /**
     * 绑定老人和家属关系
     */
    @Transactional
    public void bindFamily(Long elderUserId, Long familyUserId, String relation) {
        User elder = userRepository.findById(elderUserId)
            .orElseThrow(() -> new RuntimeException("老人用户不存在"));
        if (elder.getRole() != UserRole.ELDER) {
            throw new RuntimeException("只能绑定老人账号");
        }

        // 检查是否已存在绑定关系
        FamilyBinding binding = familyBindingRepository
            .findByElderUserIdAndFamilyUserId(elderUserId, familyUserId)
            .orElse(null);

        if (binding != null) {
            // 已存在，更新状态和关系
            binding.setStatus(BindingStatus.ACTIVE);
            binding.setRelation(relation);
            familyBindingRepository.save(binding);
        } else {
            // 新建绑定关系
            binding = new FamilyBinding();
            binding.setElderUserId(elderUserId);
            binding.setFamilyUserId(familyUserId);
            binding.setRelation(relation);
            binding.setStatus(BindingStatus.ACTIVE);
            familyBindingRepository.save(binding);
        }
    }

    /**
     * 解除绑定关系
     */
    @Transactional
    public void unbindFamily(Long elderUserId, Long familyUserId) {
        FamilyBinding binding = familyBindingRepository
            .findByElderUserIdAndFamilyUserId(elderUserId, familyUserId)
            .orElseThrow(() -> new RuntimeException("绑定关系不存在"));
        
        binding.setStatus(BindingStatus.INACTIVE);
        familyBindingRepository.save(binding);
    }

    /**
     * 获取家属绑定的所有老人
     */
    public List<User> listMyElders(Long familyUserId) {
        return familyBindingRepository.findByFamilyUserIdAndStatus(familyUserId, BindingStatus.ACTIVE).stream()
            .map(binding -> userRepository.findById(binding.getElderUserId()).orElse(null))
            .filter(user -> user != null)
            .collect(Collectors.toList());
    }

    /**
     * 获取老人绑定的所有家属
     */
    public List<User> listMyFamilies(Long elderUserId) {
        return familyBindingRepository.findByElderUserIdAndStatus(elderUserId, BindingStatus.ACTIVE).stream()
            .map(binding -> userRepository.findById(binding.getFamilyUserId()).orElse(null))
            .filter(user -> user != null)
            .collect(Collectors.toList());
    }

    /**
     * 检查家属是否有权限查看老人
     */
    public boolean canViewElder(Long familyUserId, Long elderUserId) {
        return familyBindingRepository.findByElderUserIdAndFamilyUserId(elderUserId, familyUserId)
            .map(binding -> binding.getStatus() == BindingStatus.ACTIVE)
            .orElse(false);
    }

    /**
     * 获取老人今日视图（供家属查看）
     */
    public FamilyTodayView getElderTodayView(Long elderUserId) {
        LocalDate today = LocalDate.now();
        List<MedicineDto> medicines = medicineService.listByUser(elderUserId);
        List<CheckInDto> checkIns = checkInService.listByDate(elderUserId, today);
        return new FamilyTodayView(medicines, checkIns);
    }

    /**
     * 获取老人指定日期视图
     */
    public FamilyTodayView getElderDateView(Long elderUserId, LocalDate date) {
        List<MedicineDto> medicines = medicineService.listByUser(elderUserId);
        List<CheckInDto> checkIns = checkInService.listByDate(elderUserId, date);
        return new FamilyTodayView(medicines, checkIns);
    }

    /**
     * 获取绑定关系详情
     */
    public List<FamilyBindingDetail> getFamilyBindingDetails(Long userId, UserRole role) {
        List<FamilyBinding> bindings;
        if (role == UserRole.ELDER) {
            bindings = familyBindingRepository.findByElderUserIdAndStatus(userId, BindingStatus.ACTIVE);
        } else {
            bindings = familyBindingRepository.findByFamilyUserIdAndStatus(userId, BindingStatus.ACTIVE);
        }

        return bindings.stream().map(binding -> {
            Long otherUserId = (role == UserRole.ELDER) ? binding.getFamilyUserId() : binding.getElderUserId();
            User otherUser = userRepository.findById(otherUserId).orElse(null);
            return new FamilyBindingDetail(
                binding.getId(),
                otherUserId,
                otherUser != null ? otherUser.getName() : "未知",
                otherUser != null ? otherUser.getPhone() : "",
                binding.getRelation(),
                binding.getCreatedAt()
            );
        }).collect(Collectors.toList());
    }

    @lombok.Data
    @lombok.AllArgsConstructor
    public static class FamilyTodayView {
        private List<MedicineDto> medicines;
        private List<CheckInDto> checkIns;
    }

    @lombok.Data
    @lombok.AllArgsConstructor
    public static class FamilyBindingDetail {
        private Long bindingId;
        private Long userId;
        private String name;
        private String phone;
        private String relation;
        private java.time.LocalDateTime createdAt;
    }
}
