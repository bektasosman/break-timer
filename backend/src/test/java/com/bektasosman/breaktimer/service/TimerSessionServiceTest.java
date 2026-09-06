package com.bektasosman.breaktimer.service;

import com.bektasosman.breaktimer.Schedule.TimerScheduler;
import com.bektasosman.breaktimer.Session.Status;
import com.bektasosman.breaktimer.dto.session.TimerSessionResponse;
import com.bektasosman.breaktimer.entities.TimerConfig;
import com.bektasosman.breaktimer.entities.TimerSession;
import com.bektasosman.breaktimer.entities.User;
import com.bektasosman.breaktimer.exception.TimerNotFoundException;
import com.bektasosman.breaktimer.repository.TimerConfigRepository;
import com.bektasosman.breaktimer.repository.TimerSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TimerSessionServiceTest {

    @Mock
    private TimerSessionRepository timerSessionRepo;

    @Mock
    private TimerConfigRepository timerConfigRepo;

    @Mock
    private TimerScheduler scheduler;

    @Mock
    private CurrentUserService currentUserService;

    @InjectMocks
    private TimerSessionService timerSessionService;

    private User sampleUser;
    private TimerConfig sampleConfig;
    private TimerSession sampleSession;

    @BeforeEach
    void setUp() {
        sampleUser = User.builder()
                .id(1L)
                .email("user@example.com")
                .role("ROLE_USER")
                .build();

        sampleConfig = new TimerConfig();
        sampleConfig.setId(10L);
        sampleConfig.setName("Pomodoro");
        sampleConfig.setWorkDuration(Duration.ofMinutes(25));
        sampleConfig.setBreakDuration(Duration.ofMinutes(5));
        sampleConfig.setUser(sampleUser);

        sampleSession = new TimerSession();
        sampleSession.setId(100L);
        sampleSession.setUser(sampleUser);
        sampleSession.setTimerConfig(sampleConfig);
        sampleSession.setStatus(Status.RUNNING_WORK);
        sampleSession.setCurrentStartTime(Instant.now().minusSeconds(300));
        sampleSession.setWorkedDuration(Duration.ZERO);
        sampleSession.setExpectedFinishTime(Instant.now().plusSeconds(1200));
    }

    @Test
    void shouldStartTimerSuccessfully() {
        when(currentUserService.getCurrentUser()).thenReturn(sampleUser);
        when(timerConfigRepo.findByIdAndUser(10L, sampleUser)).thenReturn(Optional.of(sampleConfig));
        when(timerSessionRepo.save(any(TimerSession.class))).thenAnswer(invocation -> {
            TimerSession s = invocation.getArgument(0);
            s.setId(101L);
            return s;
        });

        TimerSessionResponse response = timerSessionService.startTimer(10L);

        assertNotNull(response);
        assertEquals(101L, response.id());
        assertEquals(Status.RUNNING_WORK, response.status());
        verify(scheduler).scheduleFinish(eq(101L), any(Instant.class), any(Runnable.class));
    }

    @Test
    void shouldThrowWhenStartingTimerWithNonExistingConfig() {
        when(currentUserService.getCurrentUser()).thenReturn(sampleUser);
        when(timerConfigRepo.findByIdAndUser(99L, sampleUser)).thenReturn(Optional.empty());

        assertThrows(TimerNotFoundException.class, () -> timerSessionService.startTimer(99L));
        verify(timerSessionRepo, never()).save(any());
        verify(scheduler, never()).scheduleFinish(any(), any(), any());
    }

    @Test
    void shouldGetTimerSessionById() {
        when(currentUserService.getCurrentUser()).thenReturn(sampleUser);
        when(timerSessionRepo.findByIdAndUser(100L, sampleUser)).thenReturn(Optional.of(sampleSession));

        TimerSessionResponse response = timerSessionService.getTimerSession(100L);

        assertNotNull(response);
        assertEquals(100L, response.id());
    }

    @Test
    void shouldGetAllTimerSessions() {
        when(currentUserService.getCurrentUser()).thenReturn(sampleUser);
        when(timerSessionRepo.findByUser(sampleUser)).thenReturn(List.of(sampleSession));

        List<TimerSessionResponse> list = timerSessionService.getAllTimerSessions();

        assertEquals(1, list.size());
        assertEquals(100L, list.get(0).id());
    }

    @Nested
    @DisplayName("Tests für die Berechnung der gearbeiteten Zeit (Worked Duration)")
    class WorkedDurationCalculationTests {

        @Test
        @DisplayName("Beim ersten Pausieren soll die Zeit seit Start berechnet werden")
        void shouldCalculateWorkedTimeOnFirstPause() {
            // Timer vor genau 10 Minuten (600 Sekunden) gestartet, bisher 0 Sekunden gearbeitet
            sampleSession.setCurrentStartTime(Instant.now().minus(Duration.ofMinutes(10)));
            sampleSession.setWorkedDuration(Duration.ZERO);
            sampleSession.setStatus(Status.RUNNING_WORK);

            when(currentUserService.getCurrentUser()).thenReturn(sampleUser);
            when(timerSessionRepo.findByIdAndUser(100L, sampleUser)).thenReturn(Optional.of(sampleSession));
            when(timerSessionRepo.save(sampleSession)).thenReturn(sampleSession);

            TimerSessionResponse response = timerSessionService.pauseTimer(100L);

            assertNotNull(response);
            assertEquals(Status.PAUSED_WORK, response.status());

            // Überprüfen, dass die gearbeitete Zeit ~10 Minuten (ca. 600 Sekunden mit kleiner Toleranz) beträgt
            long workedSeconds = sampleSession.getWorkedDuration().toSeconds();
            assertTrue(workedSeconds >= 599 && workedSeconds <= 602,
                    "Gearbeitete Zeit sollte ca. 600 Sekunden sein, war aber: " + workedSeconds);
            verify(scheduler).cancelFinish(100L);
        }

        @Test
        @DisplayName("Beim erneuten Pausieren soll die Zeit zur bestehenden gearbeiteten Zeit addiert werden (kumulativ)")
        void shouldAccumulateWorkedTimeOnMultiplePauses() {
            // Vorher schon 10 Minuten gearbeitet, vor 5 Minuten fortgesetzt
            sampleSession.setWorkedDuration(Duration.ofMinutes(10));
            sampleSession.setCurrentStartTime(Instant.now().minus(Duration.ofMinutes(5)));
            sampleSession.setStatus(Status.RUNNING_WORK);

            when(currentUserService.getCurrentUser()).thenReturn(sampleUser);
            when(timerSessionRepo.findByIdAndUser(100L, sampleUser)).thenReturn(Optional.of(sampleSession));
            when(timerSessionRepo.save(sampleSession)).thenReturn(sampleSession);

            timerSessionService.pauseTimer(100L);

            // Bisher 10 Min + neu 5 Min = ca. 15 Minuten (900 Sekunden)
            long workedSeconds = sampleSession.getWorkedDuration().toSeconds();
            assertTrue(workedSeconds >= 899 && workedSeconds <= 902,
                    "Kumulierte Arbeitszeit sollte ca. 900 Sekunden sein, war aber: " + workedSeconds);
        }

        @Test
        @DisplayName("Beim Fortsetzen soll die verbleibende Restarbeitszeit korrekt für das neue Finish-Datum berechnet werden")
        void shouldCalculateRemainingExpectedFinishTimeOnContinue() {
            // Gesamt: 25 Min. Bereits gearbeitet: 10 Min -> Verbleibend: 15 Min.
            sampleSession.setStatus(Status.PAUSED_WORK);
            sampleSession.setWorkedDuration(Duration.ofMinutes(10));

            when(currentUserService.getCurrentUser()).thenReturn(sampleUser);
            when(timerSessionRepo.findByIdAndUser(100L, sampleUser)).thenReturn(Optional.of(sampleSession));

            Instant beforeContinue = Instant.now();
            TimerSessionResponse response = timerSessionService.continueTimer(100L);

            assertNotNull(response);
            assertEquals(Status.RUNNING_WORK, response.status());

            // Überprüfen des neu geplanten Finish-Datums: Sollte ca. now + 15 Minuten sein
            ArgumentCaptor<Instant> finishTimeCaptor = ArgumentCaptor.forClass(Instant.class);
            verify(scheduler).scheduleFinish(eq(100L), finishTimeCaptor.capture(), any(Runnable.class));

            Instant scheduledFinish = finishTimeCaptor.getValue();
            long expectedRemainingSeconds = Duration.between(beforeContinue, scheduledFinish).toSeconds();
            assertTrue(expectedRemainingSeconds >= 898 && expectedRemainingSeconds <= 902,
                    "Verbleibende Arbeitszeit sollte ca. 15 Minuten (900s) sein, war aber: " + expectedRemainingSeconds);
        }

        @Test
        @DisplayName("Beim Beenden eines RUNNING Timers soll die letzte Arbeitsphase noch addiert werden")
        void shouldAddPendingWorkTimeWhenFinishingRunningTimer() {
            // Vorher 5 Min gearbeitet, läuft seit weiteren 5 Min
            sampleSession.setWorkedDuration(Duration.ofMinutes(5));
            sampleSession.setCurrentStartTime(Instant.now().minus(Duration.ofMinutes(5)));
            sampleSession.setStatus(Status.RUNNING_WORK);

            when(timerSessionRepo.findById(100L)).thenReturn(Optional.of(sampleSession));
            when(timerSessionRepo.save(sampleSession)).thenReturn(sampleSession);

            timerSessionService.finishTimer(100L);

            assertEquals(Status.FINISHED, sampleSession.getStatus());
            long totalWorked = sampleSession.getWorkedDuration().toSeconds();
            // 5 Min + 5 Min = ca. 10 Min (600s)
            assertTrue(totalWorked >= 599 && totalWorked <= 602,
                    "Gesamte Arbeitszeit sollte ca. 600 Sekunden sein, war aber: " + totalWorked);
        }

        @Test
        @DisplayName("Beim Beenden eines PAUSED Timers darf keine zusätzliche Zeit mehr addiert werden")
        void shouldNotAddExtraTimeWhenFinishingPausedTimer() {
            // Bereits pausiert mit genau 12 Minuten gearbeiteter Zeit
            sampleSession.setStatus(Status.PAUSED_WORK);
            sampleSession.setWorkedDuration(Duration.ofMinutes(12));
            sampleSession.setCurrentStartTime(Instant.now().minus(Duration.ofHours(2))); // irrelevant, da pausiert

            when(timerSessionRepo.findById(100L)).thenReturn(Optional.of(sampleSession));
            when(timerSessionRepo.save(sampleSession)).thenReturn(sampleSession);

            timerSessionService.finishTimer(100L);

            assertEquals(Status.FINISHED, sampleSession.getStatus());
            assertEquals(Duration.ofMinutes(12), sampleSession.getWorkedDuration(),
                    "Pausierter Timer darf beim Beenden keine Zeit mehr hinzurechnen");
        }
    }
}
