package com.bektasosman.breaktimer.service;

import com.bektasosman.breaktimer.Schedule.TimerScheduler;
import com.bektasosman.breaktimer.Session.Status;
import com.bektasosman.breaktimer.dto.session.TimerSessionResponse;
import com.bektasosman.breaktimer.entities.TimerConfig;
import com.bektasosman.breaktimer.entities.TimerSession;
import com.bektasosman.breaktimer.entities.User;
import com.bektasosman.breaktimer.exception.TimerNotFoundException;
import com.bektasosman.breaktimer.mapper.TimerSessionMapper;
import com.bektasosman.breaktimer.repository.TimerConfigRepository;
import com.bektasosman.breaktimer.repository.TimerSessionRepository;
import org.springframework.stereotype.Service;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

@Service
public class TimerSessionService {

    private final TimerSessionRepository timerSessionRepo;
    private final TimerConfigRepository timerConfigRepo;
    private final TimerScheduler scheduler;
    private final CurrentUserService currentUserService;

    public TimerSessionService(TimerSessionRepository timerSessionRepo, TimerConfigRepository timerConfigRepo, TimerScheduler scheduler, CurrentUserService currentUserService) {
        this.timerSessionRepo = timerSessionRepo;
        this.timerConfigRepo = timerConfigRepo;
        this.scheduler = scheduler;
        this.currentUserService = currentUserService;
    }

    public TimerSessionResponse startTimer(Long timerConfigId) {
        User currentUser = currentUserService.getCurrentUser();
        TimerConfig timerConfig = timerConfigRepo.findByIdAndUser(timerConfigId, currentUser)
                .orElseThrow(() -> new TimerNotFoundException(timerConfigId));
        TimerSession session = new TimerSession();
        Instant now = Instant.now();
        Instant expectedFinishTime = Instant.now().plus(timerConfig.getWorkDuration());
        session.setUser(currentUser);
        session.setTimerConfig(timerConfig);
        session.setCurrentStartTime(now);
        session.setWorkedDuration(Duration.ZERO);
        session.setFinishedAt(null);
        session.setStatus(Status.RUNNING_WORK);
        session.setExpectedFinishTime(expectedFinishTime);
        TimerSession saved = timerSessionRepo.save(session);
        scheduler.scheduleFinish(  saved.getId(), saved.getExpectedFinishTime(), () -> finishTimer(saved.getId()));
        return TimerSessionMapper.toResponse(saved);
    }

    public TimerSessionResponse pauseTimer(Long sessionId) {
        Instant now = Instant.now();
        TimerSession session = timerSessionRepo.findById(sessionId).orElseThrow();
        session.setStatus(Status.PAUSED_WORK);
        addWorkedTime(session, now);
        session = timerSessionRepo.save(session);
        scheduler.cancelFinish(session.getId());
        return TimerSessionMapper.toResponse(session);
    }

    public TimerSessionResponse getTimerSession(Long sessionId) {
        User currentUser = currentUserService.getCurrentUser();
        TimerSession found = timerSessionRepo.findByIdAndUser(sessionId, currentUser)
                .orElseThrow(() -> new TimerNotFoundException(sessionId));
        return TimerSessionMapper.toResponse(found);
    }

    public List<TimerSessionResponse> getAllTimerSessions() {
        User currentUser = currentUserService.getCurrentUser();
        return timerSessionRepo.findByUser(currentUser).stream()
                .map(TimerSessionMapper::toResponse)
                .toList();
    }

    public TimerSessionResponse continueTimer(Long sessionId) {
        User currentUser = currentUserService.getCurrentUser();
        TimerSession session = timerSessionRepo.findByIdAndUser(sessionId, currentUser)
                .orElseThrow(() -> new TimerNotFoundException(sessionId));
        Instant now = Instant.now();
        session.setStatus(Status.RUNNING_WORK);
        session.setCurrentStartTime(now);
        session.setExpectedFinishTime(now.plus(session.getTimerConfig().getWorkDuration().minus(session.getWorkedDuration())));
        scheduler.scheduleFinish(  session.getId(), session.getExpectedFinishTime(), () -> finishTimer(session.getId()));
        return TimerSessionMapper.toResponse(session);
    }

    public TimerSessionResponse finishTimer(Long sessionId) {
        Instant now = Instant.now();
        // 💡 Kein User-Check hier, da diese Methode auch vom automatischen Background-Scheduler aufgerufen werden kann
        TimerSession session = timerSessionRepo.findById(sessionId)
                .orElseThrow(() -> new TimerNotFoundException(sessionId));
        session.setFinishedAt(now);
        if (session.getStatus() == Status.RUNNING_WORK) {
            addWorkedTime(session, now);
        }
        session.setStatus(Status.FINISHED);
        TimerSession saved = timerSessionRepo.save(session);
        scheduler.cancelFinish(saved.getId());
        return TimerSessionMapper.toResponse(saved);
    }

    public TimerSessionResponse checkIfFinished(Long sessionId) {
        User currentUser = currentUserService.getCurrentUser();
        TimerSession session = timerSessionRepo.findByIdAndUser(sessionId, currentUser)
                .orElseThrow(() -> new TimerNotFoundException(sessionId));
        if (session.getStatus() == Status.RUNNING_WORK && Instant.now().isAfter(session.getExpectedFinishTime())) {
            return finishTimer(session.getId());
        }
        return TimerSessionMapper.toResponse(session);
    }

    private static void addWorkedTime(TimerSession session, Instant now) {
        Duration currentWork = Duration.between(session.getCurrentStartTime(), now);
        session.setWorkedDuration(session.getWorkedDuration().plus(currentWork));
    }

}
