package com.bektasosman.breaktimer.database;


import com.bektasosman.breaktimer.entities.TimerConfig;
import com.bektasosman.breaktimer.entities.User;
import com.bektasosman.breaktimer.repository.TimerConfigRepository;
import com.bektasosman.breaktimer.repository.TimerSessionRepository;
import com.bektasosman.breaktimer.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;


@Configuration
class LoadDatabase {

    private static final Logger log = LoggerFactory.getLogger(LoadDatabase.class);

    @Bean
    CommandLineRunner initDatabase(UserRepository userRepo, TimerConfigRepository timerConfigRepo, TimerSessionRepository timerSessionRepo ) {

        return args -> {
            log.info("Preloading -> " + userRepo.save(new User("Sebi", 50, "basteln")));
            log.info("Preloading -> " + userRepo.save(new User("Dani", 30, "angeln")));

            log.info("Preloading -> " + timerConfigRepo.save(new TimerConfig("YOLO", Duration.ofMinutes(25), Duration.ofMinutes(10))));
            log.info("Preloading -> " + timerConfigRepo.save(new TimerConfig("POMDO",Duration.ofMinutes(15), Duration.ofMinutes(5))));

        };
    }

}
