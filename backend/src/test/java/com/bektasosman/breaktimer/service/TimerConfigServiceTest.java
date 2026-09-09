package com.bektasosman.breaktimer.service;

import com.bektasosman.breaktimer.dto.config.CreateTimerConfigRequest;
import com.bektasosman.breaktimer.dto.config.TimerConfigResponse;
import com.bektasosman.breaktimer.entities.TimerConfig;
import com.bektasosman.breaktimer.entities.User;
import com.bektasosman.breaktimer.exception.TimerNotFoundException;
import com.bektasosman.breaktimer.repository.TimerConfigRepository;
import com.bektasosman.breaktimer.repository.TimerSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Duration;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TimerConfigServiceTest {

    @Mock
    private TimerConfigRepository timerConfigRepo;

    @Mock
    private TimerSessionRepository timerSessionRepo;

    @Mock
    private CurrentUserService currentUserService;

    @InjectMocks
    private TimerConfigService timerConfigService;

    private User sampleUser;
    private TimerConfig sampleConfig;

    @BeforeEach
    void setUp() {
        sampleUser = User.builder()
                .id(1L)
                .email("user@example.com")
                .role("ROLE_USER")
                .build();

        sampleConfig = new TimerConfig();
        sampleConfig.setId(10L);
        sampleConfig.setName("Test Config");
        sampleConfig.setWorkDuration(Duration.ofMinutes(25));
        sampleConfig.setBreakDuration(Duration.ofMinutes(5));
        sampleConfig.setUser(sampleUser);
    }

    @Test
    void shouldCreateTimerConfig() {
        CreateTimerConfigRequest request = new CreateTimerConfigRequest("Focus Mode", Duration.ofMinutes(50), Duration.ofMinutes(10));

        when(currentUserService.getCurrentUser()).thenReturn(sampleUser);
        when(timerConfigRepo.save(any(TimerConfig.class))).thenAnswer(invocation -> {
            TimerConfig config = invocation.getArgument(0);
            config.setId(11L);
            return config;
        });

        TimerConfigResponse response = timerConfigService.createTimerConfig(request);

        assertNotNull(response);
        assertEquals(11L, response.id());
        assertEquals("Focus Mode", response.name());
        assertEquals(Duration.ofMinutes(50), response.workDuration());
        assertEquals(Duration.ofMinutes(10), response.breakDuration());
        verify(timerConfigRepo).save(any(TimerConfig.class));
    }

    @Test
    void shouldGetAllTimerConfigsForCurrentUser() {
        when(currentUserService.getCurrentUser()).thenReturn(sampleUser);
        when(timerConfigRepo.findByUser(sampleUser)).thenReturn(List.of(sampleConfig));

        List<TimerConfigResponse> result = timerConfigService.getAll();

        assertEquals(1, result.size());
        assertEquals("Test Config", result.get(0).name());
        assertEquals(10L, result.get(0).id());
    }

    @Test
    void shouldGetOneTimerConfigSuccessfully() {
        when(currentUserService.getCurrentUser()).thenReturn(sampleUser);
        when(timerConfigRepo.findByIdAndUser(10L, sampleUser)).thenReturn(Optional.of(sampleConfig));

        TimerConfigResponse response = timerConfigService.getOne(10L);

        assertNotNull(response);
        assertEquals(10L, response.id());
        assertEquals("Test Config", response.name());
    }

    @Test
    void shouldThrowWhenGetOneTimerConfigNotFound() {
        when(currentUserService.getCurrentUser()).thenReturn(sampleUser);
        when(timerConfigRepo.findByIdAndUser(99L, sampleUser)).thenReturn(Optional.empty());

        assertThrows(TimerNotFoundException.class, () -> timerConfigService.getOne(99L));
    }

    @Test
    void shouldDeleteTimerConfigSuccessfully() {
        when(currentUserService.getCurrentUser()).thenReturn(sampleUser);
        when(timerConfigRepo.findByIdAndUser(10L, sampleUser)).thenReturn(Optional.of(sampleConfig));
        when(timerSessionRepo.findByUser(sampleUser)).thenReturn(Collections.emptyList());

        timerConfigService.delete(10L);

        verify(timerConfigRepo).delete(sampleConfig);
    }

    @Test
    void shouldThrowWhenDeletingNonExistingTimerConfig() {
        when(currentUserService.getCurrentUser()).thenReturn(sampleUser);
        when(timerConfigRepo.findByIdAndUser(99L, sampleUser)).thenReturn(Optional.empty());

        assertThrows(TimerNotFoundException.class, () -> timerConfigService.delete(99L));
        verify(timerConfigRepo, never()).delete(any());
    }

    @Test
    void shouldReplaceTimerConfigSuccessfully() {
        CreateTimerConfigRequest updateRequest = new CreateTimerConfigRequest("Deep Work", Duration.ofMinutes(45), Duration.ofMinutes(15));

        when(currentUserService.getCurrentUser()).thenReturn(sampleUser);
        when(timerConfigRepo.findByIdAndUser(10L, sampleUser)).thenReturn(Optional.of(sampleConfig));
        when(timerConfigRepo.save(sampleConfig)).thenReturn(sampleConfig);

        TimerConfigResponse response = timerConfigService.replace(10L, updateRequest);

        assertNotNull(response);
        assertEquals("Deep Work", response.name());
        assertEquals(Duration.ofMinutes(45), response.workDuration());
        assertEquals(Duration.ofMinutes(15), response.breakDuration());
        verify(timerConfigRepo).save(sampleConfig);
    }

    @Test
    void shouldCreateDefaultConfigForUser() {
        timerConfigService.createDefaultConfigForUser(sampleUser);

        verify(timerConfigRepo).save(argThat(config ->
                config.getUser().equals(sampleUser) &&
                config.getName().equals("Standard Pomodoro") &&
                config.getWorkDuration().equals(Duration.ofMinutes(25)) &&
                config.getBreakDuration().equals(Duration.ofMinutes(5))
        ));
    }
}