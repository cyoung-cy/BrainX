package brain.web.mvc.service;

import brain.web.mvc.dto.request.SupportInquiryRequest;
import brain.web.mvc.dto.response.SupportInquiryResponse;
import brain.web.mvc.entity.SupportInquiry;
import brain.web.mvc.entity.User;
import brain.web.mvc.exception.ApiException;
import brain.web.mvc.repository.SupportInquiryRepository;
import brain.web.mvc.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
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
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "인증 정보가 올바르지 않습니다."));

        SupportInquiry inquiry = SupportInquiry.builder()
                .user(user)
                .category(request.category().trim())
                .title(request.title().trim())
                .content(request.content().trim())
                .build();

        return SupportInquiryResponse.from(supportInquiryRepository.save(inquiry));
    }
}
