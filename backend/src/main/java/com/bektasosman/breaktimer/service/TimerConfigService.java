package com.bektasosman.breaktimer.service;

import com.bektasosman.breaktimer.Schedule.TimerScheduler;
import com.bektasosman.breaktimer.mapper.TimerConfigMapper;
import com.bektasosman.breaktimer.dto.CreateTimerConfigRequest;
import com.bektasosman.breaktimer.dto.TimerConfigResponse;
import com.bektasosman.breaktimer.entities.TimerConfig;
import com.bektasosman.breaktimer.exception.TimerNotFoundException;
import com.bektasosman.breaktimer.repository.TimerConfigRepository;
import com.bektasosman.breaktimer.repository.TimerSessionRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TimerConfigService {

    private final TimerConfigRepository timerConfigRepo;


    public TimerConfigService(TimerConfigRepository timerConfigRepo, TimerSessionRepository timerSessionRepo, TimerScheduler scheduler) {
        this.timerConfigRepo = timerConfigRepo;
    }

    // die Methode ist jetzt im TimerSessionService
   /* public TimerSession startTimer(Long timerConfigId) {
        TimerConfig timerConfig = timerConfigRepo.findById(timerConfigId).orElseThrow();
        Instant expectedFinishTime = Instant.now().plus(timerConfig.getWorkDuration());
        TimerSession session = new TimerSession(Instant.now(), null, Status.RUNNING_WORK, Duration.ZERO, expectedFinishTime, timerConfig);
        TimerSession saved = timerSessionRepo.save(session);
        scheduler.scheduleFinish(  session.getSessionId(), session.getExpectedFinishTime(), () -> finishTimer(session.getSessionId()));
        return saved;
    }*/

    public TimerConfigResponse createTimerConfig(CreateTimerConfigRequest dto) {
        TimerConfig entity = TimerConfigMapper.toEntity(dto);
        TimerConfig saved = timerConfigRepo.save(entity);
        return TimerConfigMapper.toResponse(saved);
    }

    public List<TimerConfigResponse> getAll() {
        return timerConfigRepo.findAll().stream().map(TimerConfigMapper::toResponse).toList();
    }

    public TimerConfigResponse getOne(Long id){
        TimerConfig timerConfig = timerConfigRepo.findById(id).orElseThrow(() -> new TimerNotFoundException(id));
        return TimerConfigMapper.toResponse(timerConfig);
    }

    public void delete(Long id){
         timerConfigRepo.deleteById(id);
    }

    public TimerConfigResponse replace(Long id, CreateTimerConfigRequest dto){
        TimerConfig saved = timerConfigRepo.findById(id)
                .map(timerConfig -> {
                    timerConfig.setName(dto.name());
                    timerConfig.setBreakDuration(dto.breakDuration());
                    timerConfig.setWorkDuration(dto.workDuration());
                    return timerConfigRepo.save(timerConfig);
                })
                .orElseThrow(() -> new TimerNotFoundException(id));
        return TimerConfigMapper.toResponse(saved);
    }

}
