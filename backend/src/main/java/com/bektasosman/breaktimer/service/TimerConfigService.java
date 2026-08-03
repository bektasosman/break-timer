package com.bektasosman.breaktimer.service;

import com.bektasosman.breaktimer.Schedule.TimerScheduler;
import com.bektasosman.breaktimer.mapper.TimerConfigMapper;
import com.bektasosman.breaktimer.dto.CreateTimerConfigRequest;
import com.bektasosman.breaktimer.dto.TimerConfigResponse;
import com.bektasosman.breaktimer.entities.TimerConfig;
import com.bektasosman.breaktimer.exception.TimerNotFoundException;
import com.bektasosman.breaktimer.repository.TimerConfigRepository;
import com.bektasosman.breaktimer.repository.TimerSessionRepository;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;

@Service
public class TimerConfigService {

    private final TimerConfigRepository timerConfigRepo;


    public TimerConfigService(TimerConfigRepository timerConfigRepo) {
        this.timerConfigRepo = timerConfigRepo;
    }

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

    @Bean
    public ApplicationRunner dataInitializer(TimerConfigRepository repository) {
        return args -> {
            if (repository.count() == 0) {
                // Wir erstellen das feste Standard-Profil
                TimerConfig defaultId = new TimerConfig(
                        "Standard Pomodoro",
                        Duration.ofMinutes(25),
                        Duration.ofMinutes(5)
                );
                repository.save(defaultId);
                System.out.println("🚀 Standard-Timer-Profil wurde erfolgreich initialisiert!");
            }
        };
    }

}
