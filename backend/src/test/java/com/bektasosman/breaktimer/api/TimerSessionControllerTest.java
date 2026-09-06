package com.bektasosman.breaktimer.api;

import com.bektasosman.breaktimer.Session.Status;
import com.bektasosman.breaktimer.dto.config.TimerConfigResponse;
import com.bektasosman.breaktimer.dto.session.TimerSessionResponse;
import com.bektasosman.breaktimer.service.TimerSessionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
class TimerSessionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private TimerSessionService timerSessionService;

    private TimerSessionResponse sampleResponse;

    @BeforeEach
    void setUp() {
        TimerConfigResponse configResponse = new TimerConfigResponse(10L, "Pomodoro", Duration.ofMinutes(25), Duration.ofMinutes(5));
        sampleResponse = new TimerSessionResponse(
                100L,
                configResponse,
                Instant.now(),
                Duration.ZERO,
                null,
                Status.RUNNING_WORK
        );
    }

    @Test
    void shouldGetAllTimerSessions() throws Exception {
        when(timerSessionService.getAllTimerSessions()).thenReturn(List.of(sampleResponse));

        mockMvc.perform(get("/session"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(100))
                .andExpect(jsonPath("$[0].status").value("RUNNING_WORK"));
    }

    @Test
    void shouldGetOneTimerSession() throws Exception {
        when(timerSessionService.getTimerSession(100L)).thenReturn(sampleResponse);

        mockMvc.perform(get("/session/100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(100))
                .andExpect(jsonPath("$.status").value("RUNNING_WORK"));
    }

    @Test
    void shouldStartTimerSession() throws Exception {
        when(timerSessionService.startTimer(10L)).thenReturn(sampleResponse);

        mockMvc.perform(post("/session/10/start"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(100))
                .andExpect(jsonPath("$.status").value("RUNNING_WORK"));
    }

    @Test
    void shouldPauseTimerSession() throws Exception {
        TimerSessionResponse pausedResponse = new TimerSessionResponse(
                100L,
                sampleResponse.timerConfig(),
                sampleResponse.currentStartTime(),
                Duration.ofMinutes(5),
                null,
                Status.PAUSED_WORK
        );
        when(timerSessionService.pauseTimer(100L)).thenReturn(pausedResponse);

        mockMvc.perform(post("/session/100/pause"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(100))
                .andExpect(jsonPath("$.status").value("PAUSED_WORK"));
    }

    @Test
    void shouldContinueTimerSession() throws Exception {
        when(timerSessionService.continueTimer(100L)).thenReturn(sampleResponse);

        mockMvc.perform(post("/session/100/continue"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(100))
                .andExpect(jsonPath("$.status").value("RUNNING_WORK"));
    }

    @Test
    void shouldFinishTimerSession() throws Exception {
        TimerSessionResponse finishedResponse = new TimerSessionResponse(
                100L,
                sampleResponse.timerConfig(),
                sampleResponse.currentStartTime(),
                Duration.ofMinutes(25),
                Instant.now(),
                Status.FINISHED
        );
        when(timerSessionService.finishTimer(100L)).thenReturn(finishedResponse);

        mockMvc.perform(post("/session/100/finish"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(100))
                .andExpect(jsonPath("$.status").value("FINISHED"));
    }
}
