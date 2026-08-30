package com.bektasosman.breaktimer.mapper;

import com.bektasosman.breaktimer.dto.config.CreateTimerConfigRequest;
import com.bektasosman.breaktimer.dto.config.TimerConfigResponse;
import com.bektasosman.breaktimer.entities.TimerConfig;

public final class TimerConfigMapper {

    private TimerConfigMapper() {
    }

    public static TimerConfig toEntity(CreateTimerConfigRequest dto) {
        return new TimerConfig(
                dto.name(),
                dto.workDuration(),
                dto.breakDuration()
        );
    }

    public static TimerConfigResponse toResponse(TimerConfig entity) {
        return new TimerConfigResponse(
                entity.getId(),
                entity.getName(),
                entity.getWorkDuration(),
                entity.getBreakDuration(),
                entity.isDefault()
        );
    }
}