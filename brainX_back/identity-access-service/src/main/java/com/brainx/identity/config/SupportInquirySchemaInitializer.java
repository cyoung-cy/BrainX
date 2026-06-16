package com.brainx.identity.config;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SupportInquirySchemaInitializer implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS support_inquiries (
                    inquiry_id VARCHAR(36) NOT NULL,
                    user_id VARCHAR(36) NOT NULL,
                    category VARCHAR(40) NOT NULL,
                    title VARCHAR(120) NOT NULL,
                    content LONGTEXT NOT NULL,
                    status VARCHAR(20) NOT NULL DEFAULT 'RECEIVED',
                    created_at DATETIME(6) NULL,
                    updated_at DATETIME(6) NULL,
                    PRIMARY KEY (inquiry_id),
                    INDEX idx_support_inquiries_user_created (user_id, created_at),
                    CONSTRAINT fk_support_inquiries_user
                        FOREIGN KEY (user_id) REFERENCES users (user_id)
                        ON DELETE CASCADE
                )
                """);
    }
}
