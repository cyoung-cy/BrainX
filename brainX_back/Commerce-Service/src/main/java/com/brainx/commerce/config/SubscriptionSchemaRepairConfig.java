package com.brainx.commerce.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class SubscriptionSchemaRepairConfig {
    private static final Logger log = LoggerFactory.getLogger(SubscriptionSchemaRepairConfig.class);

    @Bean
    ApplicationRunner repairSubscriptionBillingCycleColumn(JdbcTemplate jdbcTemplate) {
        return args -> {
            try {
                jdbcTemplate.execute("""
                        ALTER TABLE commerce_subscriptions
                        ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(20)
                        """);
                jdbcTemplate.execute("""
                        UPDATE commerce_subscriptions
                        SET billing_cycle = 'MONTHLY'
                        WHERE billing_cycle IS NULL
                        """);
                jdbcTemplate.execute("""
                        ALTER TABLE commerce_subscriptions
                        ALTER COLUMN billing_cycle SET DEFAULT 'MONTHLY'
                        """);
                jdbcTemplate.execute("""
                        ALTER TABLE commerce_subscriptions
                        ALTER COLUMN billing_cycle SET NOT NULL
                        """);
                log.info("commerce_subscriptions.billing_cycle column repaired");
            } catch (Exception exception) {
                log.warn("Failed to repair commerce_subscriptions.billing_cycle column: {}", exception.getMessage());
            }
        };
    }
}
