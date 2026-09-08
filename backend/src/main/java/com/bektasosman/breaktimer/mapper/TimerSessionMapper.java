package com.bektasosman.breaktimer.mapper;

import com.bektasosman.breaktimer.Session.Status;
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
        if (session.getStatus() == Status.RUNNING_WORK && session.getCurrentStartTime() != null) {
            Duration activeElapsed = Duration.between(session.getCurrentStartTime(), Instant.now());
            if (!activeElapsed.isNegative()) {
                worked = worked.plus(activeElapsed);
            }
            if (session.getTimerConfig() != null && session.getTimerConfig().getWorkDuration() != null) {
                Duration maxWork = session.getTimerConfig().getWorkDuration();
                if (worked.compareTo(maxWork) > 0) {
                    worked = maxWork;
                }
            }
        }

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