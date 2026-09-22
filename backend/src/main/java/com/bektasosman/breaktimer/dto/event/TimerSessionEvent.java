package com.bektasosman.breaktimer.dto.event;

import com.bektasosman.breaktimer.Session.Status;

import java.time.Instant;

public record TimerSessionEvent(
        Long userId,
        String configName,
        long workDurationMinutes,
        long breakDurationMinutes,
        long workedDurationSeconds,
        Instant startedAt,
        Instant finishedAt,
        Status status
) {}
