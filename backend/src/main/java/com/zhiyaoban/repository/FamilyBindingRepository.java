package com.zhiyaoban.repository;

import com.zhiyaoban.entity.FamilyBinding;
import com.zhiyaoban.entity.BindingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FamilyBindingRepository extends JpaRepository<FamilyBinding, Long> {
    
    /**
     * 查找老人的所有绑定关系，按状态过滤
     */
    List<FamilyBinding> findByElderUserIdAndStatus(Long elderUserId, BindingStatus status);

    /**
     * 查找老人的所有激活状态的绑定关系
     */
    default List<FamilyBinding> findByElderUserIdAndStatusActive(Long elderUserId) {
        return findByElderUserIdAndStatus(elderUserId, BindingStatus.ACTIVE);
    }

    /**
     * 查找家属的所有绑定关系，按状态过滤
     */
    List<FamilyBinding> findByFamilyUserIdAndStatus(Long familyUserId, BindingStatus status);

    /**
     * 查找老人和家属之间的绑定关系
     */
    Optional<FamilyBinding> findByElderUserIdAndFamilyUserId(Long elderUserId, Long familyUserId);

    /**
     * 查找老人的所有绑定关系
     */
    List<FamilyBinding> findByElderUserId(Long elderUserId);

    /**
     * 查找家属的所有绑定关系
     */
    List<FamilyBinding> findByFamilyUserId(Long familyUserId);

    /**
     * 检查老人和家属之间是否存在绑定关系
     */
    boolean existsByElderUserIdAndFamilyUserId(Long elderUserId, Long familyUserId);

    /**
     * 根据关系类型查找绑定
     */
    List<FamilyBinding> findByRelation(String relation);

    /**
     * 查找指定状态的绑定数量
     */
    long countByStatus(BindingStatus status);

    /**
     * 删除老人和家属之间的绑定关系
     */
    void deleteByElderUserIdAndFamilyUserId(Long elderUserId, Long familyUserId);
}
