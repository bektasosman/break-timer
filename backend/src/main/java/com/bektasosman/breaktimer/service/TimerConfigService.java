package com.bektasosman.breaktimer.service;

import com.bektasosman.breaktimer.entities.User;
import com.bektasosman.breaktimer.entities.TimerSession;
import com.bektasosman.breaktimer.mapper.TimerConfigMapper;
import com.bektasosman.breaktimer.dto.config.CreateTimerConfigRequest;
import com.bektasosman.breaktimer.dto.config.TimerConfigResponse;
import com.bektasosman.breaktimer.entities.TimerConfig;
import com.bektasosman.breaktimer.exception.TimerNotFoundException;
import com.bektasosman.breaktimer.repository.TimerConfigRepository;
import com.bektasosman.breaktimer.repository.TimerSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TimerConfigService {

    private final TimerConfigRepository timerConfigRepo;
    private final TimerSessionRepository timerSessionRepo;
    private final CurrentUserService currentUserService;

    @Transactional
    public TimerConfigResponse createTimerConfig(CreateTimerConfigRequest dto) {
        User currentUser = currentUserService.getCurrentUser();
        TimerConfig entity = TimerConfigMapper.toEntity(dto, currentUser);
        TimerConfig saved = timerConfigRepo.save(entity);
        return TimerConfigMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<TimerConfigResponse> getAll() {
        User currentUser = currentUserService.getCurrentUser();
        return timerConfigRepo.findByUser(currentUser)
                .stream()
                .map(TimerConfigMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public TimerConfigResponse getOne(Long id) {
        User currentUser = currentUserService.getCurrentUser();
        TimerConfig timerConfig = timerConfigRepo.findByIdAndUser(id, currentUser)
                .orElseThrow(() -> new TimerNotFoundException(id));
        return TimerConfigMapper.toResponse(timerConfig);
    }

    @Transactional
    public void delete(Long id) {
        User currentUser = currentUserService.getCurrentUser();
        TimerConfig config = timerConfigRepo.findByIdAndUser(id, currentUser)
                .orElseThrow(() -> new TimerNotFoundException(id));

        // Preserve configName in all sessions before deleting config
        List<TimerSession> sessions = timerSessionRepo.findByUser(currentUser);
        for (TimerSession s : sessions) {
            if (s.getTimerConfig() != null && s.getTimerConfig().getId().equals(config.getId())) {
                if (s.getConfigName() == null || s.getConfigName().isBlank()) {
                    s.setConfigName(config.getName());
                }
                s.setTimerConfig(null);
                timerSessionRepo.save(s);
            }
        }

        timerConfigRepo.delete(config);
    }

    @Transactional
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

    @Transactional
    public void createDefaultConfigForUser(User user) {
        TimerConfig defaultConfig = new TimerConfig();
        defaultConfig.setName("Standard Pomodoro");
        defaultConfig.setWorkDuration(Duration.ofMinutes(25));
        defaultConfig.setBreakDuration(Duration.ofMinutes(5));
        defaultConfig.setUser(user);
        timerConfigRepo.save(defaultConfig);
    }
}