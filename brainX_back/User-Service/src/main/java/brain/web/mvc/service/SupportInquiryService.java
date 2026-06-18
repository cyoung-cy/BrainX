package brain.web.mvc.service;

import brain.web.mvc.dto.request.SupportTicketCreateRequest;
import brain.web.mvc.dto.response.SupportTicketResponses.SupportTicketData;
import brain.web.mvc.dto.response.SupportTicketResponses.SupportTicketDetailData;
import brain.web.mvc.dto.response.SupportTicketResponses.SupportTicketListData;
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
    public SupportTicketListData getMyTickets(String userId) {
        List<SupportTicketData> tickets = supportInquiryRepository.findByUserUserIdOrderByCreatedAtDesc(userId).stream()
                .map(SupportTicketData::from)
                .toList();
        return new SupportTicketListData(tickets);
    }

    @Transactional
    public SupportTicketData createTicket(String userId, SupportTicketCreateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "인증 정보가 올바르지 않습니다."));

        SupportInquiry inquiry = SupportInquiry.builder()
                .user(user)
                .category(request.category().trim())
                .title(request.subject().trim())
                .content(request.body().trim())
                .build();

        return SupportTicketData.from(supportInquiryRepository.save(inquiry));
    }

    @Transactional(readOnly = true)
    public SupportTicketDetailData getMyTicket(String userId, String ticketId) {
        SupportInquiry inquiry = supportInquiryRepository.findById(ticketId)
                .filter(item -> item.getUser().getUserId().equals(userId))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "문의 티켓을 찾을 수 없습니다."));
        return SupportTicketDetailData.from(inquiry);
    }
}
