package com.bektasosman.breaktimer.database;

import com.bektasosman.breaktimer.entities.TimerConfig;
import com.bektasosman.breaktimer.repository.TimerConfigRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

@Configuration
public class DataInitializer {

    // Wir holen uns die Werte aus der application.properties
    @Value("${app.default-timer.name}")
    private String defaultName;

    @Value("${app.default-timer.work-minutes}")
    private int defaultWorkMinutes;

    @Value("${app.default-timer.break-minutes}")
    private int defaultBreakMinutes;

    @Bean
    CommandLineRunner initDatabase(TimerConfigRepository repository) {
        return args -> {
            // Prüfen, ob die Tabelle leer ist
            if (repository.count() == 0) {
                // Timer mit den Werten aus den Properties erstellen
                TimerConfig defaultTimer = new TimerConfig(
                        defaultName,
                        Duration.ofMinutes(defaultWorkMinutes),
                        Duration.ofMinutes(defaultBreakMinutes)
                );

                // Wichtig: Das Flag setzen, damit er im Frontend als isDefault = true ankommt!
                defaultTimer.setDefault(true);

                repository.save(defaultTimer);
                System.out.println("Standard-Timer '" + defaultName + "' wurde erfolgreich generiert.");
            }
        };
    }
}
