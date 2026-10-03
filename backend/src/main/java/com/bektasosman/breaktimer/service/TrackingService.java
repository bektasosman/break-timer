package com.bektasosman.breaktimer.service;

import com.bektasosman.breaktimer.Session.Status;
import com.bektasosman.breaktimer.dto.event.TimerSessionEvent;
import com.bektasosman.breaktimer.dto.tracking.TrackingStatsResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Slf4j
@Service
public class TrackingService {
    @PostConstruct
    public void init() {
        // Beim Start direkt Initialdaten bereitstellen, damit Besucher nie leere Stats sehen
        seedSampleData();
        log.info("TrackingService initialisiert: 85 Basis-Events geladen.");
    }


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

    // Thread-sichere Zähler & Aggregationen aus den Events
    private final AtomicLong totalEventsProcessed = new AtomicLong(0);
    private final AtomicLong totalWorkedSecondsAllUsers = new AtomicLong(0);
    private final AtomicLong totalFinishedTimers = new AtomicLong(0);
    private final AtomicLong totalCancelledTimers = new AtomicLong(0);

    // Beliebteste Configs & deren Status
    private final Map<String, ConfigCounters> configStats = new ConcurrentHashMap<>();

    // Gearbeitete Sekunden pro User (userId -> Sekunden)
    private final Map<Long, AtomicLong> userWorkedSeconds = new ConcurrentHashMap<>();

    // Verteilung der Timer-Startzeiten nach Uhrzeit (Stunde 0 bis 23 -> Anzahl Starts)
    private final Map<Integer, AtomicLong> hourlyStartStats = new ConcurrentHashMap<>();

    // Abbrüche nach Start-Uhrzeit (Stunde 0 bis 23 -> Anzahl Abbrüche)
    private final Map<Integer, AtomicLong> hourlyCancelledStats = new ConcurrentHashMap<>();

    @KafkaListener(
            topics = "timer-session-events", 
            groupId = "timer-tracking-group",
            autoStartup = "${app.kafka.enabled:false}"
    )
    public void consumeTimerSessionEvent(TimerSessionEvent event) {
        if (event == null) return;
        log.info("TrackingService verarbeitet Timer-Event: {}", event);

        totalEventsProcessed.incrementAndGet();
        totalWorkedSecondsAllUsers.addAndGet(event.workedDurationSeconds());

        // Config-Schlüssel erzeugen
        String configKey = (event.configName() != null ? event.configName() : "Custom")
                + " (" + event.workDurationMinutes() + "m / " + event.breakDurationMinutes() + "m)";
        ConfigCounters counters = configStats.computeIfAbsent(configKey, k -> new ConfigCounters());

        // Start-Uhrzeit bestimmen
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
    }

    /**
     * Setzt alle Tracking-Zähler zurück.
     */
    public void resetStats() {
        totalEventsProcessed.set(0);
        totalWorkedSecondsAllUsers.set(0);
        totalFinishedTimers.set(0);
        totalCancelledTimers.set(0);
        configStats.clear();
        userWorkedSeconds.clear();
        hourlyStartStats.clear();
        hourlyCancelledStats.clear();
        log.info("Tracking-Statistiken wurden zurückgesetzt.");
    }

    /**
     * Erzeugt realistische Beispieldaten (Seeding) für Tests und Demos.
     */
    public TrackingStatsResponse seedSampleData() {
        resetStats();
        Random random = new Random();
        ZonedDateTime now = ZonedDateTime.now();

        record SampleProfile(String name, long workMin, long breakMin, int baseWeight, double cancelProbability) {}
        SampleProfile[] profiles = new SampleProfile[] {
                new SampleProfile("Standard Pomodoro", 25, 5, 45, 0.15),
                new SampleProfile("Deep Work", 50, 10, 30, 0.28),
                new SampleProfile("Quick Sprint", 15, 3, 15, 0.08),
                new SampleProfile("Power Hour", 60, 15, 10, 0.38)
        };

        // Typische Aktivitätskurve über 24 Stunden (Morgenpeak 9-11 Uhr, Nachmittagspeak 14-16 Uhr)
        int[] hourlyDistributionWeights = new int[] {
                0, 0, 0, 0, 0, 1, 2, 4, 8, 12, 10, 8, 5, 7, 11, 9, 7, 5, 4, 3, 2, 1, 0, 0
        };

        int totalSessionsToGenerate = 85;

        for (int i = 0; i < totalSessionsToGenerate; i++) {
            // Wähle Profil nach Gewichtung
            int roll = random.nextInt(100);
            SampleProfile chosen;
            if (roll < 45) chosen = profiles[0];
            else if (roll < 75) chosen = profiles[1];
            else if (roll < 90) chosen = profiles[2];
            else chosen = profiles[3];

            // Wähle Startstunde nach Tagesverlauf
            int hour = 9;
            int hourRoll = random.nextInt(100);
            int accum = 0;
            for (int h = 0; h < 24; h++) {
                accum += hourlyDistributionWeights[h];
                if (hourRoll < accum || h == 23) {
                    hour = h;
                    break;
                }
            }

            // Zufälliger User (1 bis 12)
            long userId = (long) (random.nextInt(12) + 1);

            // Zufällige Minuten in der Stunde
            int minute = random.nextInt(60);
            ZonedDateTime startTime = now.withHour(hour).withMinute(minute).withSecond(random.nextInt(60));
            Instant startedAt = startTime.toInstant();

            // Status ermitteln
            boolean isCancelled = random.nextDouble() < chosen.cancelProbability();
            Status status = isCancelled ? Status.CANCELLED : Status.FINISHED;

            long workedSeconds;
            if (status == Status.FINISHED) {
                workedSeconds = chosen.workMin() * 60;
            } else {
                // Abgebrochen nach einem Teil der Zeit (z. B. 20% bis 80%)
                double fraction = 0.2 + (random.nextDouble() * 0.6);
                workedSeconds = Math.max(60, (long) (chosen.workMin() * 60 * fraction));
            }

            Instant finishedAt = startedAt.plusSeconds(workedSeconds);

            TimerSessionEvent event = new TimerSessionEvent(
                    userId,
                    chosen.name(),
                    chosen.workMin(),
                    chosen.breakMin(),
                    workedSeconds,
                    startedAt,
                    finishedAt,
                    status
            );

            consumeTimerSessionEvent(event);
        }

        log.info("Seeding abgeschlossen: {} Events generiert.", totalEventsProcessed.get());
        return getAggregatedStats();
    }

    // --- Aggregiertes TrackingStatsResponse DTO für API ---

    public TrackingStatsResponse getAggregatedStats() {
        return new TrackingStatsResponse(
                getTotalEventsCount(),
                getTotalWorkedSecondsAllUsers(),
                getTotalFinishedTimers(),
                getTotalCancelledTimers(),
                Math.round(getOverallCancellationRate() * 10.0) / 10.0,
                getPeakStartHourFormatted(),
                getMostCancelledConfig(),
                getPopularConfigStats(),
                getConfigCancellationRates(),
                getHourlyStartDistribution(),
                getHourlyCancellationRates()
        );
    }

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

    public double getOverallCancellationRate() {
        long total = totalEventsProcessed.get();
        return total == 0 ? 0.0 : (totalCancelledTimers.get() * 100.0) / total;
    }

    public Map<String, Long> getPopularConfigStats() {
        Map<String, Long> result = new HashMap<>();
        configStats.forEach((key, c) -> result.put(key, c.total()));
        return Collections.unmodifiableMap(result);
    }

    public Map<String, Double> getConfigCancellationRates() {
        Map<String, Double> result = new HashMap<>();
        configStats.forEach((key, c) -> result.put(key, Math.round(c.cancellationRate() * 10.0) / 10.0));
        return Collections.unmodifiableMap(result);
    }

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

    public Map<Integer, Long> getHourlyStartDistribution() {
        Map<Integer, Long> result = new HashMap<>();
        hourlyStartStats.forEach((hour, count) -> result.put(hour, count.get()));
        return Collections.unmodifiableMap(result);
    }

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

    public Integer getPeakStartHour() {
        return hourlyStartStats.entrySet().stream()
                .max(Map.Entry.comparingByValue((a, b) -> Long.compare(a.get(), b.get())))
                .map(Map.Entry::getKey)
                .orElse(null);
    }

    public String getPeakStartHourFormatted() {
        Integer peakHour = getPeakStartHour();
        if (peakHour == null) {
            return "Keine Daten vorhanden";
        }
        return String.format("%02d:00 - %02d:00 Uhr", peakHour, (peakHour + 1) % 24);
    }
}
