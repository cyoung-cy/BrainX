package brain.web.mvc.repository;

import brain.web.mvc.entity.SupportInquiry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SupportInquiryRepository extends JpaRepository<SupportInquiry, String> {
    List<SupportInquiry> findByUserUserIdOrderByCreatedAtDesc(String userId);
}
