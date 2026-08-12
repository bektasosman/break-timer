package com.bektasosman.breaktimer.api;


import com.bektasosman.breaktimer.dto.CreateTimerConfigRequest;
import com.bektasosman.breaktimer.dto.TimerConfigResponse;
import com.bektasosman.breaktimer.entities.TimerConfig;
import com.bektasosman.breaktimer.entities.TimerSession;
import com.bektasosman.breaktimer.service.TimerConfigService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@CrossOrigin(origins = {"http://localhost:4200", "https://break-timer-1.onrender.com"})
@RequestMapping("/config")
public class TimerConfigController {

    private final TimerConfigService timerConfigService;

    public TimerConfigController(TimerConfigService timerConfigService) {
        this.timerConfigService = timerConfigService;
    }

    @PostMapping
    TimerConfigResponse create(@RequestBody CreateTimerConfigRequest dto) {
        return timerConfigService.createTimerConfig(dto);
    }

    @GetMapping
    List<TimerConfigResponse> getAll() {
        return timerConfigService.getAll();
    }

    @GetMapping("/{id}")
    TimerConfigResponse getOne(@PathVariable Long id) {
        return timerConfigService.getOne(id);
    }

    @DeleteMapping("/{id}")
    void delete(@PathVariable Long id) {
        timerConfigService.delete(id);
    }

    @PutMapping("/{id}")
    TimerConfigResponse replace(@RequestBody CreateTimerConfigRequest dto, @PathVariable Long id) {
       return timerConfigService.replace(id, dto);
    }


}
