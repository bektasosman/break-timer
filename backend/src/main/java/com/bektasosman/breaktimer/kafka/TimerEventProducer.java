package com.bektasosman.breaktimer.kafka;
import com.bektasosman.breaktimer.dto.event.TimerSessionEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class TimerEventProducer {

    public static final String TOPIC_NAME = "timer-session-events";

    // Spring Boot injiziert das fertige KafkaTemplate automatisch
    private final KafkaTemplate<String, TimerSessionEvent> kafkaTemplate;

    public void sendTimerEvent(TimerSessionEvent event) {
        // Wir nutzen userId als Key, damit alle Events eines Users in geordneter Reihenfolge bleiben
        String key = String.valueOf(event.userId());

        log.info("Sende Timer-Event an Topic '{}' mit Key '{}': {}", TOPIC_NAME, key, event);

        // Sendet das DTO asynchron an Kafka
        kafkaTemplate.send(TOPIC_NAME, key, event)
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