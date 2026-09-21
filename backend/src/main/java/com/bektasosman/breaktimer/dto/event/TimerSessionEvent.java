package com.bektasosman.breaktimer.dto.event;

import com.bektasosman.breaktimer.Session.Status;

import java.time.Instant;

public record TimerSessionEvent(
        Long sessionId,
        Long userId,
        Long timerConfigId,
        String configName,
        long workDurationMinutes,
        long breakDurationMinutes,
        long actualWorkedSeconds,
        Instant startedAt,
        Instant finishedAt,
        Status status
) {}
