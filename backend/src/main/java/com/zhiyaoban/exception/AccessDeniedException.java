package com.zhiyaoban.exception;

/**
 * 访问权限异常
 * 用于无权访问资源的情况
 */
public class AccessDeniedException extends BusinessException {
    
    private final String resourceType;
    private final Object resourceId;
    
    public AccessDeniedException(String resourceType, Object resourceId) {
        super(String.format("无权访问该 %s (ID: %s)", resourceType, resourceId));
        this.resourceType = resourceType;
        this.resourceId = resourceId;
    }
    
    public AccessDeniedException(String message) {
        super(message);
        this.resourceType = "未知资源";
        this.resourceId = null;
    }
    
    public String getResourceType() {
        return resourceType;
    }
    
    public Object getResourceId() {
        return resourceId;
    }
}