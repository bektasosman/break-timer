package com.bektasosman.breaktimer.api;

import com.bektasosman.breaktimer.dto.tracking.TrackingStatsResponse;
import com.bektasosman.breaktimer.service.TrackingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@CrossOrigin(origins = {"http://localhost:4200", "https://break-timer-app.onrender.com"})
@RequestMapping("/tracking")
@RequiredArgsConstructor
public class TrackingController {

    // Optional, falls Kafka und TrackingService auf Render deaktiviert sind
    private final Optional<TrackingService> trackingService;

    @GetMapping("/stats")
    public ResponseEntity<TrackingStatsResponse> getGlobalTrackingStats() {
        if (trackingService.isEmpty()) {
            // Leere/Default-Antwort zurückgeben, falls Kafka inaktiv ist
            return ResponseEntity.ok(new TrackingStatsResponse(
                    0L, 0L, 0L, 0L, 0.0,
                    "Tracking inaktiv",
                    "Keine Daten vorhanden",
                    Map.of(), Map.of(), Map.of(), Map.of()
            ));
        }

        return ResponseEntity.ok(trackingService.get().getAggregatedStats());
    }
}
