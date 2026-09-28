package com.bektasosman.breaktimer.dto.tracking;

import java.util.Map;

public record TrackingStatsResponse(
        long totalEventsCount,
        long totalWorkedSecondsAllUsers,
        long totalFinishedTimers,
        long totalCancelledTimers,
        double overallCancellationRate,
        String peakStartHourFormatted,
        String mostCancelledConfig,
        Map<String, Long> popularConfigs,
        Map<String, Double> configCancellationRates,
        Map<Integer, Long> hourlyStartDistribution,
        Map<Integer, Double> hourlyCancellationRates
) {
}
