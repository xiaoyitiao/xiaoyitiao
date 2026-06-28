package com.zhiyaoban.service;

import com.zhiyaoban.dto.MedicineDto;
import com.zhiyaoban.entity.Medicine;
import com.zhiyaoban.entity.MedicineFrequency;
import com.zhiyaoban.entity.User;
import com.zhiyaoban.exception.AccessDeniedException;
import com.zhiyaoban.exception.AuthenticationFailedException;
import com.zhiyaoban.exception.ResourceNotFoundException;
import com.zhiyaoban.repository.MedicineRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 药品服务
 */
@Service
@RequiredArgsConstructor
public class MedicineService {

    private final MedicineRepository medicineRepository;

    public List<MedicineDto> listByUser(Long userId) {
        return medicineRepository.findByUserIdOrderByTimeAsc(userId).stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    public MedicineDto getById(Long id, Long userId) {
        Medicine medicine = medicineRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("药品", id));
        if (!medicine.getUserId().equals(userId)) {
            throw new AccessDeniedException("药品", id);
        }
        return toDto(medicine);
    }

    @Transactional
    public MedicineDto save(MedicineDto dto, Long userId) {
        Medicine medicine = new Medicine();
        if (dto.getId() != null) {
            medicine = medicineRepository.findById(dto.getId())
                .orElseThrow(() -> new ResourceNotFoundException("药品", dto.getId()));
            if (!medicine.getUserId().equals(userId)) {
                throw new AccessDeniedException("药品", dto.getId());
            }
        }
        medicine.setUserId(userId);
        medicine.setName(dto.getName());
        medicine.setDose(dto.getDose());
        medicine.setActualDose(dto.getActualDose());
        medicine.setTime(dto.getTime());
        
        // 处理频率枚举
        if (dto.getFrequency() != null) {
            medicine.setFrequency(MedicineFrequency.valueOf(dto.getFrequency().toUpperCase()));
        }
        
        medicine.setWeekDays(dto.getWeekDays());
        medicine.setIntervalDays(dto.getIntervalDays());
        medicine.setStartDate(dto.getStartDate());
        medicine.setEndDate(dto.getEndDate());
        medicine.setStock(dto.getStock());
        medicine.setNote(dto.getNote());
        medicine.setIcon(dto.getIcon());
        return toDto(medicineRepository.save(medicine));
    }

    @Transactional
    public void delete(Long id, Long userId) {
        Medicine medicine = medicineRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("药品", id));
        if (!medicine.getUserId().equals(userId)) {
            throw new AccessDeniedException("药品", id);
        }
        medicineRepository.delete(medicine);
    }

    /**
     * 批量删除药品
     */
    @Transactional
    public void deleteBatch(List<Long> ids, Long userId) {
        for (Long id : ids) {
            delete(id, userId);
        }
    }

    /**
     * 根据名称搜索药品
     */
    public List<MedicineDto> searchByName(Long userId, String keyword) {
        return medicineRepository.findByUserIdAndNameContainingIgnoreCase(userId, keyword).stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    /**
     * 根据频率筛选药品
     */
    public List<MedicineDto> filterByFrequency(Long userId, MedicineFrequency frequency) {
        return medicineRepository.findByUserIdAndFrequency(userId, frequency).stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    /**
     * 获取库存不足的药品
     */
    public List<MedicineDto> getLowStockMedicines(Long userId, int threshold) {
        return medicineRepository.findByUserIdAndStockLessThanEqual(userId, threshold).stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    /**
     * 更新药品库存
     */
    @Transactional
    public void updateStock(Long id, Long userId, int stock) {
        Medicine medicine = medicineRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("药品", id));
        if (!medicine.getUserId().equals(userId)) {
            throw new AccessDeniedException("药品", id);
        }
        medicine.setStock(stock);
        medicineRepository.save(medicine);
    }

    /**
     * 增加药品库存
     */
    @Transactional
    public void increaseStock(Long id, Long userId, int amount) {
        Medicine medicine = medicineRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("药品", id));
        if (!medicine.getUserId().equals(userId)) {
            throw new AccessDeniedException("药品", id);
        }
        medicine.setStock(medicine.getStock() + amount);
        medicineRepository.save(medicine);
    }

    private MedicineDto toDto(Medicine medicine) {
        MedicineDto dto = new MedicineDto();
        dto.setId(medicine.getId());
        dto.setName(medicine.getName());
        dto.setDose(medicine.getDose());
        dto.setActualDose(medicine.getActualDose());
        dto.setTime(medicine.getTime());
        dto.setFrequency(medicine.getFrequency() != null ? medicine.getFrequency().name() : null);
        dto.setWeekDays(medicine.getWeekDays());
        dto.setIntervalDays(medicine.getIntervalDays());
        dto.setStartDate(medicine.getStartDate());
        dto.setEndDate(medicine.getEndDate());
        dto.setStock(medicine.getStock());
        dto.setNote(medicine.getNote());
        dto.setIcon(medicine.getIcon());
        return dto;
    }

    public User getCurrentUser(Object principal) {
        if (principal instanceof User) {
            return (User) principal;
        }
        throw new AuthenticationFailedException("用户未登录");
    }
}
