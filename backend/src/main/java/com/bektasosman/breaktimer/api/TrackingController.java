package com.bektasosman.breaktimer.api;

import com.bektasosman.breaktimer.dto.tracking.TrackingStatsResponse;
import com.bektasosman.breaktimer.service.TrackingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@CrossOrigin(origins = {"http://localhost:4200", "https://break-timer-app.onrender.com"})
@RequestMapping("/tracking")
@RequiredArgsConstructor
public class TrackingController {

    private final TrackingService trackingService;

    @GetMapping("/stats")
    public ResponseEntity<TrackingStatsResponse> getGlobalTrackingStats() {
        return ResponseEntity.ok(trackingService.getAggregatedStats());
    }

    @PostMapping("/seed")
    public ResponseEntity<TrackingStatsResponse> seedTrackingStats() {
        return ResponseEntity.ok(trackingService.seedSampleData());
    }

    @GetMapping("/seed")
    public ResponseEntity<TrackingStatsResponse> seedTrackingStatsGet() {
        return ResponseEntity.ok(trackingService.seedSampleData());
    }

    @PostMapping("/reset")
    public ResponseEntity<Map<String, String>> resetTrackingStats() {
        trackingService.resetStats();
        return ResponseEntity.ok(Map.of("message", "Tracking-Statistiken erfolgreich zurückgesetzt"));
    }
}
