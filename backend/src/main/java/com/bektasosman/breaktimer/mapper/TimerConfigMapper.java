package com.bektasosman.breaktimer.mapper;

import com.bektasosman.breaktimer.dto.config.CreateTimerConfigRequest;
import com.bektasosman.breaktimer.dto.config.TimerConfigResponse;
import com.bektasosman.breaktimer.entities.TimerConfig;
import com.bektasosman.breaktimer.entities.User;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public final class TimerConfigMapper {

    public static TimerConfig toEntity(CreateTimerConfigRequest dto, User user) {
        TimerConfig config = new TimerConfig();
        config.setName(dto.name());
        config.setWorkDuration(dto.workDuration());
        config.setBreakDuration(dto.breakDuration());
        config.setUser(user);
        return config;

    }
        public static TimerConfigResponse toResponse(TimerConfig entity) {
        return new TimerConfigResponse(
                entity.getId(),
                entity.getName(),
                entity.getWorkDuration(),
                entity.getBreakDuration()
        );
    }
}