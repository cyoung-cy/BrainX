package com.brainx.identity.repository;

import com.brainx.identity.entity.SupportInquiry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SupportInquiryRepository extends JpaRepository<SupportInquiry, String> {
    List<SupportInquiry> findByUserUserIdOrderByCreatedAtDesc(String userId);
}
