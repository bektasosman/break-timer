package com.bektasosman.breaktimer.dto;

import java.time.Duration;

public record TimerConfigResponse(
        Long id, String name, Duration workDuration, Duration breakDuration, boolean isDefault
) {
}
