package com.zhiyaoban.security;

import org.springframework.security.core.context.SecurityContextHolder;

/**
 * 当前登录用户工具类
 * 从 SecurityContext 中获取手机号（JWT 过滤器中已设置）
 */
public class CurrentUser {

    /**
     * 获取当前登录用户的手机号
     *
     * @return 手机号，未登录时可能为 null
     */
    public static String getPhone() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        return authentication.getName();
    }
}
