package com.zhiyaoban.repository;

import com.zhiyaoban.entity.User;
import com.zhiyaoban.entity.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    /**
     * 根据手机号查找用户
     */
    Optional<User> findByPhone(String phone);

    /**
     * 检查手机号是否存在
     */
    boolean existsByPhone(String phone);

    /**
     * 根据角色查找用户列表
     */
    List<User> findByRole(UserRole role);

    /**
     * 根据角色查找用户，按创建时间倒序
     */
    List<User> findByRoleOrderByCreatedAtDesc(UserRole role);

    /**
     * 根据手机号和角色查找用户
     */
    Optional<User> findByPhoneAndRole(String phone, UserRole role);

    /**
     * 根据名称模糊查询用户
     */
    List<User> findByNameContainingIgnoreCase(String name);

    /**
     * 根据角色和名称模糊查询用户
     */
    List<User> findByRoleAndNameContainingIgnoreCase(UserRole role, String name);
}
