package com.bektasosman.breaktimer.mapper;

import com.bektasosman.breaktimer.dto.session.TimerSessionResponse;
import com.bektasosman.breaktimer.entities.TimerSession;

import java.time.Duration;

public final class TimerSessionMapper {

    private TimerSessionMapper(){
    }

    public static TimerSessionResponse toResponse(TimerSession session){
        return new TimerSessionResponse(
                session.getId(),
                TimerConfigMapper.toResponse(session.getTimerConfig()),
                session.getConfigName(),
                session.getStartedAt(),
                session.getCurrentStartTime(),
                session.getWorkedDuration() != null ? session.getWorkedDuration() : Duration.ZERO,
                session.getFinishedAt(),
                session.getStatus()
        );
    }
}