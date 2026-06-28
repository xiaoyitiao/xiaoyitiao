package com.zhiyaoban.repository;

import com.zhiyaoban.entity.PushSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PushSubscriptionRepository extends JpaRepository<PushSubscription, Long> {
    
    /**
     * 查找用户的所有推送订阅
     */
    List<PushSubscription> findByUserId(Long userId);

    /**
     * 根据端点查找订阅
     */
    Optional<PushSubscription> findByEndpoint(String endpoint);

    /**
     * 查找用户和端点的订阅
     */
    Optional<PushSubscription> findByUserIdAndEndpoint(Long userId, String endpoint);

    /**
     * 检查用户是否有订阅
     */
    boolean existsByUserId(Long userId);

    /**
     * 删除用户的所有订阅
     */
    void deleteByUserId(Long userId);

    /**
     * 删除指定端点的订阅
     */
    void deleteByEndpoint(String endpoint);

    /**
     * 查找指定时间之后更新的订阅
     */
    List<PushSubscription> findByUpdatedAtAfter(LocalDateTime dateTime);

    /**
     * 统计用户的订阅数量
     */
    long countByUserId(Long userId);
}
