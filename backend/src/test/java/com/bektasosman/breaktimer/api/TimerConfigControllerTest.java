package com.bektasosman.breaktimer.api;

import com.bektasosman.breaktimer.dto.config.CreateTimerConfigRequest;
import com.bektasosman.breaktimer.dto.config.TimerConfigResponse;
import com.bektasosman.breaktimer.service.TimerConfigService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Duration;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
class TimerConfigControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private TimerConfigService timerConfigService;

    @Test
    void shouldCreateTimerConfig() throws Exception {
        TimerConfigResponse response = new TimerConfigResponse(1L, "Focus", Duration.ofMinutes(25), Duration.ofMinutes(5));

        when(timerConfigService.createTimerConfig(any(CreateTimerConfigRequest.class))).thenReturn(response);

        mockMvc.perform(post("/config")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Focus\",\"workDuration\":\"PT25M\",\"breakDuration\":\"PT5M\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name").value("Focus"));
    }

    @Test
    void shouldGetAllTimerConfigs() throws Exception {
        TimerConfigResponse response = new TimerConfigResponse(1L, "Focus", Duration.ofMinutes(25), Duration.ofMinutes(5));
        when(timerConfigService.getAll()).thenReturn(List.of(response));

        mockMvc.perform(get("/config"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].name").value("Focus"));
    }

    @Test
    void shouldGetOneTimerConfig() throws Exception {
        TimerConfigResponse response = new TimerConfigResponse(1L, "Focus", Duration.ofMinutes(25), Duration.ofMinutes(5));
        when(timerConfigService.getOne(1L)).thenReturn(response);

        mockMvc.perform(get("/config/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name").value("Focus"));
    }

    @Test
    void shouldDeleteTimerConfig() throws Exception {
        mockMvc.perform(delete("/config/1"))
                .andExpect(status().isOk());

        verify(timerConfigService).delete(1L);
    }

    @Test
    void shouldReplaceTimerConfig() throws Exception {
        TimerConfigResponse response = new TimerConfigResponse(1L, "Updated Focus", Duration.ofMinutes(30), Duration.ofMinutes(10));

        when(timerConfigService.replace(eq(1L), any(CreateTimerConfigRequest.class))).thenReturn(response);

        mockMvc.perform(put("/config/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Updated Focus\",\"workDuration\":\"PT30M\",\"breakDuration\":\"PT10M\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name").value("Updated Focus"));
    }
}
