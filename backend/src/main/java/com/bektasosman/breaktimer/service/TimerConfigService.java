package com.bektasosman.breaktimer.service;

import com.bektasosman.breaktimer.entities.User;
import com.bektasosman.breaktimer.mapper.TimerConfigMapper;
import com.bektasosman.breaktimer.dto.config.CreateTimerConfigRequest;
import com.bektasosman.breaktimer.dto.config.TimerConfigResponse;
import com.bektasosman.breaktimer.entities.TimerConfig;
import com.bektasosman.breaktimer.exception.TimerNotFoundException;
import com.bektasosman.breaktimer.repository.TimerConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TimerConfigService {

    private final TimerConfigRepository timerConfigRepo;
    private final CurrentUserService currentUserService;

    public TimerConfigResponse createTimerConfig(CreateTimerConfigRequest dto) {
        User currentUser = currentUserService.getCurrentUser();
        TimerConfig entity = TimerConfigMapper.toEntity(dto, currentUser);
        TimerConfig saved = timerConfigRepo.save(entity);
        return TimerConfigMapper.toResponse(saved);
    }

    public List<TimerConfigResponse> getAll() {
        User currentUser = currentUserService.getCurrentUser();
        return timerConfigRepo.findByUser(currentUser)
                .stream()
                .map(TimerConfigMapper::toResponse)
                .toList();
    }

    public TimerConfigResponse getOne(Long id) {
        User currentUser = currentUserService.getCurrentUser();
        TimerConfig timerConfig = timerConfigRepo.findByIdAndUser(id, currentUser)
                .orElseThrow(() -> new TimerNotFoundException(id));
        return TimerConfigMapper.toResponse(timerConfig);
    }

    public void delete(Long id) {
        User currentUser = currentUserService.getCurrentUser();
        TimerConfig config = timerConfigRepo.findByIdAndUser(id, currentUser)
                .orElseThrow(() -> new TimerNotFoundException(id));
        timerConfigRepo.delete(config);
    }

    public TimerConfigResponse replace(Long id, CreateTimerConfigRequest dto) {
        User currentUser = currentUserService.getCurrentUser();
        TimerConfig config = timerConfigRepo.findByIdAndUser(id, currentUser)
                .orElseThrow(() -> new TimerNotFoundException(id));
        config.setName(dto.name());
        config.setWorkDuration(dto.workDuration());
        config.setBreakDuration(dto.breakDuration());
        TimerConfig saved = timerConfigRepo.save(config);
        return TimerConfigMapper.toResponse(saved);
    }

    public void createDefaultConfigForUser(User user) {
        TimerConfig defaultConfig = new TimerConfig();
        defaultConfig.setName("Standard Pomodoro");
        defaultConfig.setWorkDuration(Duration.ofMinutes(25));
        defaultConfig.setBreakDuration(Duration.ofMinutes(5));
        defaultConfig.setUser(user);
        timerConfigRepo.save(defaultConfig);
    }
}
