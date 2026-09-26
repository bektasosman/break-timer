package com.bektasosman.breaktimer.service;

import com.bektasosman.breaktimer.Session.Status;
import com.bektasosman.breaktimer.dto.event.TimerSessionEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class TrackingServiceTest {

    private TrackingService trackingService;

    @BeforeEach
    void setUp() {
        trackingService = new TrackingService();
    }

    @Test
    @DisplayName("Sollte Timer-Events konsumieren und beliebte Configs, Startzeiten sowie Abbruchquoten korrekt berechnen")
    void shouldConsumeTimerEventsAndAggregateStats() {
        var morningStart = LocalDateTime.of(2026, 9, 23, 9, 30).atZone(ZoneId.systemDefault()).toInstant();
        var afternoonStart1 = LocalDateTime.of(2026, 9, 23, 14, 15).atZone(ZoneId.systemDefault()).toInstant();
        var afternoonStart2 = LocalDateTime.of(2026, 9, 23, 14, 45).atZone(ZoneId.systemDefault()).toInstant();

        // 1x Finished Pomodoro um 09:30
        TimerSessionEvent event1 = new TimerSessionEvent(
                1L,
                "Pomodoro",
                25L,
                5L,
                1500L,
                morningStart,
                morningStart.plusSeconds(1500),
                Status.FINISHED
        );

        // 1x Cancelled Pomodoro um 14:15
        TimerSessionEvent event2 = new TimerSessionEvent(
                1L,
                "Pomodoro",
                25L,
                5L,
                600L,
                afternoonStart1,
                afternoonStart1.plusSeconds(600),
                Status.CANCELLED
        );

        // 1x Cancelled Long Focus um 14:45
        TimerSessionEvent event3 = new TimerSessionEvent(
                2L,
                "Long Focus",
                50L,
                10L,
                1200L,
                afternoonStart2,
                afternoonStart2.plusSeconds(1200),
                Status.CANCELLED
        );

        trackingService.consumeTimerSessionEvent(event1);
        trackingService.consumeTimerSessionEvent(event2);
        trackingService.consumeTimerSessionEvent(event3);

        // Basis-Zahlen
        assertThat(trackingService.getTotalEventsCount()).isEqualTo(3);
        assertThat(trackingService.getTotalFinishedTimers()).isEqualTo(1);
        assertThat(trackingService.getTotalCancelledTimers()).isEqualTo(2);
        assertThat(trackingService.getTotalWorkedSecondsAllUsers()).isEqualTo(1500L + 600L + 1200L);

        // Gesamt-Abbruchquote: 2 von 3 = 66.7 %
        assertThat(trackingService.getOverallCancellationRate()).isCloseTo(66.67, org.assertj.core.data.Offset.offset(0.1));

        // Beliebteste Configs
        Map<String, Long> configStats = trackingService.getPopularConfigStats();
        assertThat(configStats.get("Pomodoro (25m Work / 5m Break)")).isEqualTo(2L);
        assertThat(configStats.get("Long Focus (50m Work / 10m Break)")).isEqualTo(1L);

        // Abbruchquote pro Config
        Map<String, Double> configCancelRates = trackingService.getConfigCancellationRates();
        assertThat(configCancelRates.get("Pomodoro (25m Work / 5m Break)")).isEqualTo(50.0);
        assertThat(configCancelRates.get("Long Focus (50m Work / 10m Break)")).isEqualTo(100.0);

        assertThat(trackingService.getMostCancelledConfig()).contains("Long Focus (50m Work / 10m Break)");

        // Stunden-Auswertungen
        assertThat(trackingService.getPeakStartHour()).isEqualTo(14);
        assertThat(trackingService.getPeakStartHourFormatted()).isEqualTo("14:00 - 15:00 Uhr");

        Map<Integer, Double> hourlyCancelRates = trackingService.getHourlyCancellationRates();
        assertThat(hourlyCancelRates.get(9)).isEqualTo(0.0);
        assertThat(hourlyCancelRates.get(14)).isEqualTo(100.0);
    }
}
