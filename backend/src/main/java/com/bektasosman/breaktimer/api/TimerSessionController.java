package com.bektasosman.breaktimer.api;

import com.bektasosman.breaktimer.dto.session.TimerSessionResponse;
import com.bektasosman.breaktimer.service.TimerSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@CrossOrigin(origins = {"http://localhost:4200", "https://break-timer-app.onrender.com"})
@RequestMapping("/session")
@RequiredArgsConstructor
public class TimerSessionController {

    private final TimerSessionService timerSessionService;

    @GetMapping
    public List<TimerSessionResponse> getAll() {
        return timerSessionService.getAllTimerSessions();
    }

    @GetMapping("/{id}")
    public TimerSessionResponse one(@PathVariable Long id) {
        return timerSessionService.getTimerSession(id);
    }

    @PostMapping("/{id}/pause")
    public TimerSessionResponse pause(@PathVariable Long id) {
        return timerSessionService.pauseTimer(id);
    }

    @PostMapping("/{id}/continue")
    public TimerSessionResponse continueTimer(@PathVariable Long id) {
        return timerSessionService.continueTimer(id);
    }

    @PostMapping("/{id}/finish")
    public TimerSessionResponse finishTimer(@PathVariable Long id) {
        return timerSessionService.finishTimer(id);
    }

    @PostMapping("/{configId}/start")
    public TimerSessionResponse startTimer(@PathVariable Long configId) {
        return timerSessionService.startTimer(configId);
    }

    @DeleteMapping
    public ResponseEntity<Void> deleteAll() {
        timerSessionService.deleteAllTimerSessions();
        return ResponseEntity.noContent().build();
    }
}
