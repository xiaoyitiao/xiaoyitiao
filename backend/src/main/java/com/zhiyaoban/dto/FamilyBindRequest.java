package com.zhiyaoban.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class FamilyBindRequest {
    @NotNull(message = "老人用户ID不能为空")
    private Long elderUserId;

    @NotBlank(message = "关系不能为空")
    private String relation;
}
