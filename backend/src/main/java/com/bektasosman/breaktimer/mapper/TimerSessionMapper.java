package com.bektasosman.breaktimer.mapper;

import com.bektasosman.breaktimer.dto.session.TimerSessionResponse;
import com.bektasosman.breaktimer.entities.TimerSession;

import java.time.Duration;
import java.time.Instant;

public final class TimerSessionMapper {

    private TimerSessionMapper(){
    }

    public static TimerSessionResponse toResponse(TimerSession session){
        if (session == null) {
            return null;
        }

        Duration worked = session.getWorkedDuration() != null ? session.getWorkedDuration() : Duration.ZERO;
        String name = session.getConfigName();
        if (name == null || name.isBlank()) {
            if (session.getTimerConfig() != null) {
                name = session.getTimerConfig().getName();
            }
        }
        if (name == null || name.isBlank()) {
            name = "Pomodoro Session";
        }

        Instant startedAt = session.getCreatedAt() != null 
                ? session.getCreatedAt() 
                : (session.getCurrentStartTime() != null ? session.getCurrentStartTime() : Instant.now());

        return new TimerSessionResponse(
                session.getId(),
                TimerConfigMapper.toResponse(session.getTimerConfig()),
                name,
                startedAt,
                session.getCurrentStartTime(),
                worked,
                session.getFinishedAt(),
                session.getStatus()
        );
    }
}