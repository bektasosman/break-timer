package com.bektasosman.breaktimer.dto.config;

import java.time.Duration;

public record TimerConfigResponse(
        Long id, String name, Duration workDuration, Duration breakDuration
) {
}
