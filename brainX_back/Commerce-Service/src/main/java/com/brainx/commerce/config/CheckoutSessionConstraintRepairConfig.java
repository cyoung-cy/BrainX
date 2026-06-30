package com.brainx.commerce.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class CheckoutSessionConstraintRepairConfig {
    private static final Logger log = LoggerFactory.getLogger(CheckoutSessionConstraintRepairConfig.class);

    @Bean
    ApplicationRunner repairCheckoutSessionStatusConstraint(JdbcTemplate jdbcTemplate) {
        return args -> {
            try {
                jdbcTemplate.execute("ALTER TABLE commerce_checkout_sessions DROP CONSTRAINT IF EXISTS commerce_checkout_sessions_status_check");
                jdbcTemplate.execute("""
                        ALTER TABLE commerce_checkout_sessions
                        ADD CONSTRAINT commerce_checkout_sessions_status_check
                        CHECK (status IN ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED', 'CANCELLED', 'EXPIRED'))
                        """);
                log.info("commerce_checkout_sessions_status_check constraint repaired with REFUNDED status support");
            } catch (Exception exception) {
                log.warn("Failed to repair commerce_checkout_sessions_status_check constraint: {}", exception.getMessage());
            }
        };
    }
}
