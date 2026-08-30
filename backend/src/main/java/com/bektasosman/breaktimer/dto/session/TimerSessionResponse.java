package com.bektasosman.breaktimer.dto.session;

import com.bektasosman.breaktimer.Session.Status;
import com.bektasosman.breaktimer.dto.config.TimerConfigResponse;

import java.time.Duration;
import java.time.Instant;

public record TimerSessionResponse(
        Long id,
        TimerConfigResponse timerConfig,
        Instant currentStartTime,
        Duration workedDuration,
        Instant finishedAt,
        Status status
) {}
