package com.bektasosman.breaktimer.dto;

import java.time.Duration;

public record  CreateTimerConfigRequest(
        String name,
        Duration workDuration,
        Duration breakDuration
) {}
