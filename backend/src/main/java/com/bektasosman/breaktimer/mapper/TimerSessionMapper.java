package com.bektasosman.breaktimer.mapper;

import com.bektasosman.breaktimer.dto.session.TimerSessionResponse;
import com.bektasosman.breaktimer.entities.TimerSession;

public final class TimerSessionMapper {

    private TimerSessionMapper(){
    }

    public static TimerSessionResponse toResponse(TimerSession session){
        return new TimerSessionResponse(
                session.getId(),
                TimerConfigMapper.toResponse(session.getTimerConfig()),
                session.getCurrentStartTime(),
                session.getWorkedDuration(),
                session.getFinishedAt(),
                session.getStatus()
        );
    }


}
