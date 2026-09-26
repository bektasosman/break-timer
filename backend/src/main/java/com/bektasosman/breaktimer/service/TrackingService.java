package com.bektasosman.breaktimer.service;

import com.bektasosman.breaktimer.Session.Status;
import com.bektasosman.breaktimer.dto.event.TimerSessionEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.time.ZoneId;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Slf4j
@Service
public class TrackingService {

    // Helper Record für Config-Zähler
    public record ConfigCounters(AtomicLong finished, AtomicLong cancelled) {
        public ConfigCounters() {
            this(new AtomicLong(0), new AtomicLong(0));
        }
        public long total() {
            return finished.get() + cancelled.get();
        }
        public double cancellationRate() {
            long t = total();
            return t == 0 ? 0.0 : (cancelled.get() * 100.0) / t;
        }
    }

    // Thread-sichere Zähler & Aggregationen aus den Kafka-Events
    private final AtomicLong totalEventsProcessed = new AtomicLong(0);
    private final AtomicLong totalWorkedSecondsAllUsers = new AtomicLong(0);
    private final AtomicLong totalFinishedTimers = new AtomicLong(0);
    private final AtomicLong totalCancelledTimers = new AtomicLong(0);

    // Beliebteste Configs & deren Status (z. B. "Pomodoro (25m Work / 5m Break)" -> Counters)
    private final Map<String, ConfigCounters> configStats = new ConcurrentHashMap<>();

    // Gearbeitete Sekunden pro User (userId -> Sekunden)
    private final Map<Long, AtomicLong> userWorkedSeconds = new ConcurrentHashMap<>();

    // Verteilung der Timer-Startzeiten nach Uhrzeit (Stunde 0 bis 23 -> Anzahl Starts)
    private final Map<Integer, AtomicLong> hourlyStartStats = new ConcurrentHashMap<>();

    // Abbrüche nach Start-Uhrzeit (Stunde 0 bis 23 -> Anzahl Abbrüche)
    private final Map<Integer, AtomicLong> hourlyCancelledStats = new ConcurrentHashMap<>();

    @KafkaListener(topics = "timer-session-events", groupId = "timer-tracking-group")
    public void consumeTimerSessionEvent(TimerSessionEvent event) {
        log.info("Kafka Consumer empfing Timer-Event: {}", event);

        totalEventsProcessed.incrementAndGet();
        totalWorkedSecondsAllUsers.addAndGet(event.workedDurationSeconds());

        // Config-Schlüssel erzeugen
        String configKey = (event.configName() != null ? event.configName() : "Custom")
                + " (" + event.workDurationMinutes() + "m Work / " + event.breakDurationMinutes() + "m Break)";
        ConfigCounters counters = configStats.computeIfAbsent(configKey, k -> new ConfigCounters());

        // Status zählen (Erfolgreich vs Abgebrochen)
        int hour = event.startedAt() != null ? event.startedAt().atZone(ZoneId.systemDefault()).getHour() : -1;
        if (hour >= 0) {
            hourlyStartStats.computeIfAbsent(hour, h -> new AtomicLong(0)).incrementAndGet();
        }

        if (event.status() == Status.FINISHED) {
            totalFinishedTimers.incrementAndGet();
            counters.finished().incrementAndGet();
        } else if (event.status() == Status.CANCELLED) {
            totalCancelledTimers.incrementAndGet();
            counters.cancelled().incrementAndGet();
            if (hour >= 0) {
                hourlyCancelledStats.computeIfAbsent(hour, h -> new AtomicLong(0)).incrementAndGet();
            }
        }

        // User-Statistik aktualisieren
        if (event.userId() != null) {
            userWorkedSeconds.computeIfAbsent(event.userId(), u -> new AtomicLong(0))
                    .addAndGet(event.workedDurationSeconds());
        }

        log.info("Tracking aktualisiert | Gesamt-Abbruchquote: {}% | Höchste Abbruch-Config: {}",
                String.format("%.1f", getOverallCancellationRate()), getMostCancelledConfig());
    }

    // --- Abfragemethoden für Controller / Analytics API ---

    public long getTotalEventsCount() {
        return totalEventsProcessed.get();
    }

    public long getTotalWorkedSecondsAllUsers() {
        return totalWorkedSecondsAllUsers.get();
    }

    public long getTotalFinishedTimers() {
        return totalFinishedTimers.get();
    }

    public long getTotalCancelledTimers() {
        return totalCancelledTimers.get();
    }

    /**
     * Gesamte Abbruchquote aller Timer in Prozent (0.0 - 100.0).
     */
    public double getOverallCancellationRate() {
        long total = totalEventsProcessed.get();
        return total == 0 ? 0.0 : (totalCancelledTimers.get() * 100.0) / total;
    }

    /**
     * Beliebtheit der Configs (Nutzungsanzahl).
     */
    public Map<String, Long> getPopularConfigStats() {
        Map<String, Long> result = new HashMap<>();
        configStats.forEach((key, c) -> result.put(key, c.total()));
        return Collections.unmodifiableMap(result);
    }

    /**
     * Abbruchquoten pro Timer-Konfiguration in Prozent.
     */
    public Map<String, Double> getConfigCancellationRates() {
        Map<String, Double> result = new HashMap<>();
        configStats.forEach((key, c) -> result.put(key, Math.round(c.cancellationRate() * 10.0) / 10.0));
        return Collections.unmodifiableMap(result);
    }

    /**
     * Die Konfiguration mit der höchsten Abbruchquote.
     */
    public String getMostCancelledConfig() {
        return configStats.entrySet().stream()
                .filter(e -> e.getValue().total() > 0)
                .max((a, b) -> Double.compare(a.getValue().cancellationRate(), b.getValue().cancellationRate()))
                .map(e -> String.format("%s (%.1f%% Abbruch)", e.getKey(), e.getValue().cancellationRate()))
                .orElse("Keine Daten vorhanden");
    }

    public long getWorkedSecondsForUser(Long userId) {
        AtomicLong seconds = userWorkedSeconds.get(userId);
        return seconds != null ? seconds.get() : 0;
    }

    /**
     * Verteilung aller Starts über den Tag (0-23 Uhr).
     */
    public Map<Integer, Long> getHourlyStartDistribution() {
        Map<Integer, Long> result = new HashMap<>();
        hourlyStartStats.forEach((hour, count) -> result.put(hour, count.get()));
        return Collections.unmodifiableMap(result);
    }

    /**
     * Abbruchquote pro Tagesstunde (0-23 Uhr) in Prozent.
     */
    public Map<Integer, Double> getHourlyCancellationRates() {
        Map<Integer, Double> result = new HashMap<>();
        hourlyStartStats.forEach((hour, totalStarts) -> {
            long total = totalStarts.get();
            long cancelled = hourlyCancelledStats.getOrDefault(hour, new AtomicLong(0)).get();
            double rate = total == 0 ? 0.0 : (cancelled * 100.0) / total;
            result.put(hour, Math.round(rate * 10.0) / 10.0);
        });
        return Collections.unmodifiableMap(result);
    }

    /**
     * Stunde (0-23) mit den meisten Starts.
     */
    public Integer getPeakStartHour() {
        return hourlyStartStats.entrySet().stream()
                .max(Map.Entry.comparingByValue((a, b) -> Long.compare(a.get(), b.get())))
                .map(Map.Entry::getKey)
                .orElse(null);
    }

    /**
     * Beliebteste Startzeit formatiert (z. B. "14:00 - 15:00 Uhr").
     */
    public String getPeakStartHourFormatted() {
        Integer peakHour = getPeakStartHour();
        if (peakHour == null) {
            return "Keine Daten vorhanden";
        }
        return String.format("%02d:00 - %02d:00 Uhr", peakHour, (peakHour + 1) % 24);
    }

    /**
     * Stunde mit der höchsten Abbruchquote.
     */
    public String getPeakCancellationHourFormatted() {
        return hourlyStartStats.keySet().stream()
                .max((h1, h2) -> {
                    long total1 = hourlyStartStats.get(h1).get();
                    long canc1 = hourlyCancelledStats.getOrDefault(h1, new AtomicLong(0)).get();
                    double rate1 = total1 == 0 ? 0.0 : (double) canc1 / total1;

                    long total2 = hourlyStartStats.get(h2).get();
                    long canc2 = hourlyCancelledStats.getOrDefault(h2, new AtomicLong(0)).get();
                    double rate2 = total2 == 0 ? 0.0 : (double) canc2 / total2;
                    return Double.compare(rate1, rate2);
                })
                .map(hour -> String.format("%02d:00 - %02d:00 Uhr", hour, (hour + 1) % 24))
                .orElse("Keine Daten vorhanden");
    }
}
