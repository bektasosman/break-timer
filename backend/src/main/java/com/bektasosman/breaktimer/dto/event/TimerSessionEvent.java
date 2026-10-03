package com.bektasosman.breaktimer.dto.event;

import com.bektasosman.breaktimer.Session.Status;
import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.Instant;

public record TimerSessionEvent(
        Long userId,
        String configName,
        long workDurationMinutes,
        long breakDurationMinutes,
        long workedDurationSeconds,
        @JsonFormat(shape = JsonFormat.Shape.STRING)
        Instant startedAt,
        @JsonFormat(shape = JsonFormat.Shape.STRING)
        Instant finishedAt,
        Status status
) {}
