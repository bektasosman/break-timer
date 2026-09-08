package com.bektasosman.breaktimer.mapper;

import com.bektasosman.breaktimer.dto.session.TimerSessionResponse;
import com.bektasosman.breaktimer.entities.TimerSession;

import java.time.Duration;

public final class TimerSessionMapper {

    private TimerSessionMapper(){
    }

    public static TimerSessionResponse toResponse(TimerSession session){
        if (session == null) {
            return null;
        }

        Duration worked = session.getWorkedDuration() != null ? session.getWorkedDuration() : Duration.ZERO;

        return new TimerSessionResponse(
                session.getId(),
                TimerConfigMapper.toResponse(session.getTimerConfig()),
                session.getCurrentStartTime(),
                worked,
                session.getFinishedAt(),
                session.getStatus()
        );
    }
}