package com.bektasosman.breaktimer.api;
import com.bektasosman.breaktimer.dto.TimerSessionResponse;
import com.bektasosman.breaktimer.entities.TimerSession;
import com.bektasosman.breaktimer.service.TimerSessionService;
import org.springframework.web.bind.annotation.*;
import java.util.List;


@RestController
@CrossOrigin(origins = "http://localhost:4200")
@RequestMapping("/timer-sessions")
public class TimerSessionController {


    private final TimerSessionService timerSessionService;

    public TimerSessionController(TimerSessionService timerSessionService) {
        this.timerSessionService = timerSessionService;
    }

    @GetMapping()
    List<TimerSessionResponse> getAll() {
        return timerSessionService.getAllTimerSessions();
    }

    @GetMapping("/{id}")
    TimerSessionResponse one(@PathVariable Long id) {
        return timerSessionService.getTimerSession(id);
    }

    @PostMapping("/{id}/pause")
    TimerSessionResponse pause(@PathVariable Long id) {
        return timerSessionService.pauseTimer(id);
    }

    @PostMapping("/{id}/continue")
    TimerSessionResponse continueTimer(@PathVariable Long id) {
        return timerSessionService.continueTimer(id);
    }

    @PostMapping("/{id}/finish")
    TimerSessionResponse finishTimer(@PathVariable Long id){
        return timerSessionService.finishTimer(id);
    }

    @PostMapping("/{configId}/start")
    TimerSessionResponse startTimer(@PathVariable Long configId){
        return timerSessionService.startTimer(configId);
    }



}
