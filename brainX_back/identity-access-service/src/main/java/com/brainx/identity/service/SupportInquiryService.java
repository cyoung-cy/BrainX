package com.brainx.identity.service;

import com.brainx.identity.dto.request.SupportInquiryRequest;
import com.brainx.identity.dto.response.SupportInquiryResponse;
import com.brainx.identity.entity.SupportInquiry;
import com.brainx.identity.entity.User;
import com.brainx.identity.exception.BrainXException;
import com.brainx.identity.repository.SupportInquiryRepository;
import com.brainx.identity.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SupportInquiryService {

    private final SupportInquiryRepository supportInquiryRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<SupportInquiryResponse> getMyInquiries(String userId) {
        return supportInquiryRepository.findByUserUserIdOrderByCreatedAtDesc(userId).stream()
                .map(SupportInquiryResponse::from)
                .toList();
    }

    @Transactional
    public SupportInquiryResponse createInquiry(String userId, SupportInquiryRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> BrainXException.notFound("사용자를 찾을 수 없습니다"));

        SupportInquiry inquiry = SupportInquiry.builder()
                .user(user)
                .category(request.getCategory().trim())
                .title(request.getTitle().trim())
                .content(request.getContent().trim())
                .build();

        return SupportInquiryResponse.from(supportInquiryRepository.save(inquiry));
    }
}
