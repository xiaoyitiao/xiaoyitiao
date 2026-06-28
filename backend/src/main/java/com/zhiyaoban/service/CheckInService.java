package com.zhiyaoban.service;

import com.zhiyaoban.dto.CheckInDto;
import com.zhiyaoban.entity.CheckIn;
import com.zhiyaoban.entity.Medicine;
import com.zhiyaoban.exception.AccessDeniedException;
import com.zhiyaoban.exception.ResourceNotFoundException;
import com.zhiyaoban.repository.CheckInRepository;
import com.zhiyaoban.repository.MedicineRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * 用药打卡服务
 */
@Service
@RequiredArgsConstructor
public class CheckInService {

    private final CheckInRepository checkInRepository;
    private final MedicineRepository medicineRepository;

    @Transactional
    public void checkIn(Long userId, CheckInDto dto) {
        Medicine medicine = medicineRepository.findById(dto.getMedicineId())
            .orElseThrow(() -> new ResourceNotFoundException("药品", dto.getMedicineId()));
        if (!medicine.getUserId().equals(userId)) {
            throw new AccessDeniedException("药品", dto.getMedicineId());
        }

        LocalDate date = dto.getDate() != null ? dto.getDate() : LocalDate.now();
        Optional<CheckIn> existing = checkInRepository.findByUserIdAndMedicineIdAndDate(userId, dto.getMedicineId(), date);

        CheckIn checkIn = existing.orElseGet(CheckIn::new);
        checkIn.setUserId(userId);
        checkIn.setMedicineId(dto.getMedicineId());
        checkIn.setDate(date);
        checkIn.setTakenAt(LocalDateTime.now());
        checkIn.setDose(dto.getDose() != null ? dto.getDose() : medicine.getActualDose());
        checkInRepository.save(checkIn);
    }

    @Transactional
    public void cancelCheckIn(Long userId, Long medicineId, LocalDate date) {
        CheckIn checkIn = checkInRepository.findByUserIdAndMedicineIdAndDate(userId, medicineId, date)
            .orElseThrow(() -> new RuntimeException("打卡记录不存在"));
        checkInRepository.delete(checkIn);
    }

    public List<CheckInDto> listByDate(Long userId, LocalDate date) {
        return checkInRepository.findByUserIdAndDateOrderByTakenAtDesc(userId, date).stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    public List<CheckInDto> listByMonth(Long userId, YearMonth yearMonth) {
        LocalDate start = yearMonth.atDay(1);
        LocalDate end = yearMonth.atEndOfMonth();
        return checkInRepository.findByUserIdAndDateBetween(userId, start, end).stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    /**
     * 获取日期范围内的打卡记录
     */
    public List<CheckInDto> listByDateRange(Long userId, LocalDate startDate, LocalDate endDate) {
        return checkInRepository.findByUserIdAndDateBetween(userId, startDate, endDate).stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    private CheckInDto toDto(CheckIn checkIn) {
        CheckInDto dto = new CheckInDto();
        dto.setMedicineId(checkIn.getMedicineId());
        dto.setDate(checkIn.getDate());
        dto.setTakenAt(checkIn.getTakenAt());
        dto.setDose(checkIn.getDose());
        return dto;
    }
}
