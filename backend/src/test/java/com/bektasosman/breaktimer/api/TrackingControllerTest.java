package com.bektasosman.breaktimer.api;

import com.bektasosman.breaktimer.dto.tracking.TrackingStatsResponse;
import com.bektasosman.breaktimer.service.TrackingService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class TrackingControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private TrackingService trackingService;

    @Test
    @DisplayName("GET /tracking/stats sollte aggregierte Statistiken ohne Authentifizierung zurückgeben")
    void shouldReturnTrackingStats() throws Exception {
        TrackingStatsResponse mockResponse = new TrackingStatsResponse(
                10L,
                15000L,
                8L,
                2L,
                20.0,
                "14:00 - 15:00 Uhr",
                "Long Focus (50.0% Abbruch)",
                Map.of("Pomodoro (25m Work / 5m Break)", 8L),
                Map.of("Pomodoro (25m Work / 5m Break)", 12.5),
                Map.of(14, 6L),
                Map.of(14, 16.7)
        );

        when(trackingService.getAggregatedStats()).thenReturn(mockResponse);

        mockMvc.perform(get("/tracking/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalEventsCount").value(10))
                .andExpect(jsonPath("$.totalWorkedSecondsAllUsers").value(15000))
                .andExpect(jsonPath("$.totalFinishedTimers").value(8))
                .andExpect(jsonPath("$.totalCancelledTimers").value(2))
                .andExpect(jsonPath("$.overallCancellationRate").value(20.0))
                .andExpect(jsonPath("$.peakStartHourFormatted").value("14:00 - 15:00 Uhr"))
                .andExpect(jsonPath("$.popularConfigs['Pomodoro (25m Work / 5m Break)']").value(8));
    }
}
