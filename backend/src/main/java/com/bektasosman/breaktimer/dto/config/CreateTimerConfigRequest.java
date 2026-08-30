package com.bektasosman.breaktimer.dto.config;

import java.time.Duration;

public record  CreateTimerConfigRequest(
        String name,
        Duration workDuration,
        Duration breakDuration
) {}
