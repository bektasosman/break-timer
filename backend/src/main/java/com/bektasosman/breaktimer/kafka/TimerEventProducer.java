package com.bektasosman.breaktimer.kafka;

import com.bektasosman.breaktimer.dto.event.TimerSessionEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Slf4j
@Service
public class TimerEventProducer {

    public static final String TOPIC_NAME = "timer-session-events";

    // Optional: Wenn Kafka deaktiviert ist (z. B. auf Render), ist kafkaTemplate empty
    private final Optional<KafkaTemplate<String, TimerSessionEvent>> kafkaTemplate;

    @Autowired
    public TimerEventProducer(Optional<KafkaTemplate<String, TimerSessionEvent>> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void sendTimerEvent(TimerSessionEvent event) {
        if (kafkaTemplate.isEmpty()) {
            log.debug("Kafka ist deaktiviert. Event wird nicht gesendet: {}", event);
            return;
        }

        // Wir nutzen userId als Key, damit alle Events eines Users in geordneter Reihenfolge bleiben
        String key = String.valueOf(event.userId());

        log.info("Sende Timer-Event an Topic '{}' mit Key '{}': {}", TOPIC_NAME, key, event);

        // Sendet das DTO asynchron an Kafka
        kafkaTemplate.get().send(TOPIC_NAME, key, event)
                .whenComplete((result, ex) -> {
                    if (ex == null) {
                        log.info("Event erfolgreich an Kafka gesendet! Offset: {}",
                                result.getRecordMetadata().offset());
                    } else {
                        log.error("Fehler beim Senden des Events an Kafka", ex);
                    }
                });
    }
}
