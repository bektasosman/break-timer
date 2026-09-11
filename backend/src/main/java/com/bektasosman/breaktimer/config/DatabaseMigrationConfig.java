package com.bektasosman.breaktimer.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class DatabaseMigrationConfig {

    @Bean
    public CommandLineRunner dropOldStatusCheckConstraint(JdbcTemplate jdbcTemplate) {
        return args -> {
            try {
                jdbcTemplate.execute("ALTER TABLE timer_session DROP CONSTRAINT IF EXISTS timer_session_status_check;");
            } catch (Exception e) {
                // Ignore if constraint does not exist or database is H2
            }
        };
    }
}