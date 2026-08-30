package com.bektasosman.breaktimer.service;

import com.bektasosman.breaktimer.Schedule.TimerScheduler;
import com.bektasosman.breaktimer.Session.Status;
import com.bektasosman.breaktimer.dto.session.TimerSessionResponse;
import com.bektasosman.breaktimer.entities.TimerConfig;
import com.bektasosman.breaktimer.entities.TimerSession;
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

    public TimerSessionService(TimerSessionRepository timerSessionRepo, TimerConfigRepository timerConfigRepo, TimerScheduler scheduler) {
        this.timerSessionRepo = timerSessionRepo;
        this.timerConfigRepo = timerConfigRepo;
        this.scheduler = scheduler;
    }

    public TimerSessionResponse startTimer(Long timerConfigId) {
        TimerConfig timerConfig = timerConfigRepo.findById(timerConfigId).orElseThrow();
        Instant expectedFinishTime = Instant.now().plus(timerConfig.getWorkDuration());
        TimerSession session = new TimerSession(Instant.now(), null, Status.RUNNING_WORK, Duration.ZERO, expectedFinishTime, timerConfig);
        TimerSession saved = timerSessionRepo.save(session);
        scheduler.scheduleFinish(  saved.getSessionId(), saved.getExpectedFinishTime(), () -> finishTimer(saved.getSessionId()));
        return TimerSessionMapper.toResponse(saved);
    }

    public TimerSessionResponse pauseTimer(Long sessionId) {
        Instant now = Instant.now();
        TimerSession session = timerSessionRepo.findById(sessionId).orElseThrow();
        session.setStatus(Status.PAUSED_WORK);
        addWorkedTime(session, now);
        session = timerSessionRepo.save(session);
        scheduler.cancelFinish(session.getSessionId());
        return TimerSessionMapper.toResponse(session);
    }

    public TimerSessionResponse getTimerSession(Long sessionId) {
        TimerSession found = timerSessionRepo.findById(sessionId).orElseThrow();
        return TimerSessionMapper.toResponse(found);
    }

    public List<TimerSessionResponse> getAllTimerSessions() {
        return timerSessionRepo.findAll().stream().map(TimerSessionMapper::toResponse).toList();
    }

    public TimerSessionResponse continueTimer(Long sessionId) {
        TimerSession session = timerSessionRepo.findById(sessionId).map(sess -> {
            sess.setStatus(Status.RUNNING_WORK);
            sess.setCurrentStartTime(Instant.now());
            sess.setExpectedFinishTime(Instant.now().plus(sess.getTimerConfig().getWorkDuration().minus(sess.getWorkedDuration())));
            return timerSessionRepo.save(sess);
        }).orElseThrow();
        scheduler.scheduleFinish(  session.getSessionId(), session.getExpectedFinishTime(), () -> finishTimer(session.getSessionId()));
        return TimerSessionMapper.toResponse(session);
    }

    public TimerSessionResponse finishTimer(Long sessionId) {
        Instant now = Instant.now();
        TimerSession session = timerSessionRepo.findById(sessionId).orElseThrow();
        if (session.getStatus() == Status.RUNNING_WORK) {
            addWorkedTime(session, now);
        }
        session.setStatus(Status.FINISHED);
        TimerSession saved = timerSessionRepo.save(session);
        scheduler.cancelFinish(saved.getSessionId());
        return TimerSessionMapper.toResponse(saved);
    }

    private static void addWorkedTime(TimerSession session, Instant now) {
        Duration currentWork = Duration.between(
                session.getCurrentStartTime(),
                now
        );
        session.setWorkedDuration(
                session.getWorkedDuration().plus(currentWork)
        );
    }

    public TimerSessionResponse checkIfFinished(Long sessionId) {
        TimerSession session = timerSessionRepo.findById(sessionId).orElseThrow();
        if (session.getStatus() == Status.RUNNING_WORK && Instant.now().isAfter(session.getExpectedFinishTime())) {
            return finishTimer(session.getSessionId());
        }
        return TimerSessionMapper.toResponse(session);
    }

}
