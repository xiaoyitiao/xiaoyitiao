package com.zhiyaoban.dto;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class CheckInDto {
    private Long medicineId;
    private LocalDate date;
    private LocalDateTime takenAt;
    private String dose;
}
