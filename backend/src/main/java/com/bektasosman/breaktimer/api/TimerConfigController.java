package com.bektasosman.breaktimer.api;


import com.bektasosman.breaktimer.dto.config.CreateTimerConfigRequest;
import com.bektasosman.breaktimer.dto.config.TimerConfigResponse;
import com.bektasosman.breaktimer.service.TimerConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@CrossOrigin(origins = {"http://localhost:4200", "https://break-timer-app.onrender.com"})
@RequestMapping("/config")
@RequiredArgsConstructor
public class TimerConfigController {

    private final TimerConfigService timerConfigService;

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
