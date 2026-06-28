package com.zhiyaoban.exception;

/**
 * 资源未找到异常
 * 用于药品、用户等资源不存在的情况
 */
public class ResourceNotFoundException extends BusinessException {
    
    private final String resourceType;
    private final Object resourceId;
    
    public ResourceNotFoundException(String resourceType, Object resourceId) {
        super(String.format("%s 不存在 (ID: %s)", resourceType, resourceId));
        this.resourceType = resourceType;
        this.resourceId = resourceId;
    }
    
    public ResourceNotFoundException(String message) {
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