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
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TimerSessionService {

    private final TimerSessionRepository timerSessionRepo;
    private final TimerConfigRepository timerConfigRepo;
    private final TimerScheduler scheduler;
    private final CurrentUserService currentUserService;

    @Transactional
    public TimerSessionResponse startTimer(Long timerConfigId) {
        User currentUser = currentUserService.getCurrentUser();
        TimerConfig timerConfig = timerConfigRepo.findByIdAndUser(timerConfigId, currentUser)
                .orElseThrow(() -> new TimerNotFoundException(timerConfigId));
        TimerSession session = new TimerSession();
        Instant now = Instant.now();
        Instant expectedFinishTime = Instant.now().plus(timerConfig.getWorkDuration());
        session.setUser(currentUser);
        session.setTimerConfig(timerConfig);
        session.setConfigName(timerConfig.getName());
        session.setCreatedAt(now);
        session.setCurrentStartTime(now);
        session.setWorkedDuration(Duration.ZERO);
        session.setFinishedAt(null);
        session.setStatus(Status.RUNNING_WORK);
        session.setExpectedFinishTime(expectedFinishTime);
        TimerSession saved = timerSessionRepo.save(session);
        scheduler.scheduleFinish(saved.getId(), saved.getExpectedFinishTime(), () -> finishTimer(saved.getId(), null));
        return TimerSessionMapper.toResponse(saved);
    }

    @Transactional
    public TimerSessionResponse pauseTimer(Long sessionId) {
        return pauseTimer(sessionId, null);
    }

    @Transactional
    public TimerSessionResponse pauseTimer(Long sessionId, Long workedSeconds) {
        Instant now = Instant.now();
        User currentUser = currentUserService.getCurrentUser();
        TimerSession session = timerSessionRepo.findByIdAndUser(sessionId, currentUser)
                .orElseThrow(() -> new TimerNotFoundException(sessionId));

        // Abgebrochene oder beendete Sessions nicht wieder auf PAUSED zurücksetzen
        if (session.getStatus() == Status.CANCELLED || session.getStatus() == Status.FINISHED) {
            return TimerSessionMapper.toResponse(session);
        }

        session.setStatus(Status.PAUSED_WORK);
        if (workedSeconds != null) {
            session.setWorkedDuration(Duration.ofSeconds(Math.max(0, workedSeconds)));
        } else if (session.getCurrentStartTime() != null) {
            addWorkedTime(session, now);
        }
        session = timerSessionRepo.save(session);
        scheduler.cancelFinish(session.getId());
        return TimerSessionMapper.toResponse(session);
    }

    @Transactional(readOnly = true)
    public TimerSessionResponse getTimerSession(Long sessionId) {
        User currentUser = currentUserService.getCurrentUser();
        TimerSession found = timerSessionRepo.findByIdAndUser(sessionId, currentUser)
                .orElseThrow(() -> new TimerNotFoundException(sessionId));
        return TimerSessionMapper.toResponse(found);
    }

    @Transactional(readOnly = true)
    public List<TimerSessionResponse> getAllTimerSessions() {
        User currentUser = currentUserService.getCurrentUser();
        return timerSessionRepo.findByUser(currentUser).stream()
                .map(TimerSessionMapper::toResponse)
                .toList();
    }

    @Transactional
    public TimerSessionResponse continueTimer(Long sessionId) {
        User currentUser = currentUserService.getCurrentUser();
        TimerSession session = timerSessionRepo.findByIdAndUser(sessionId, currentUser)
                .orElseThrow(() -> new TimerNotFoundException(sessionId));

        if (session.getStatus() == Status.CANCELLED || session.getStatus() == Status.FINISHED) {
            return TimerSessionMapper.toResponse(session);
        }

        Instant now = Instant.now();
        session.setStatus(Status.RUNNING_WORK);
        session.setCurrentStartTime(now);
        Duration totalConfig = session.getTimerConfig() != null ? session.getTimerConfig().getWorkDuration() : Duration.ofMinutes(25);
        Duration remaining = totalConfig.minus(session.getWorkedDuration() != null ? session.getWorkedDuration() : Duration.ZERO);
        if (remaining.isNegative()) {
            remaining = Duration.ZERO;
        }
        session.setExpectedFinishTime(now.plus(remaining));
        scheduler.scheduleFinish(session.getId(), session.getExpectedFinishTime(), () -> finishTimer(session.getId(), null));
        return TimerSessionMapper.toResponse(session);
    }

    @Transactional
    public TimerSessionResponse finishTimer(Long sessionId) {
        return finishTimer(sessionId, null);
    }

    @Transactional
    public TimerSessionResponse finishTimer(Long sessionId, Long workedSeconds) {
        Instant now = Instant.now();
        TimerSession session = timerSessionRepo.findById(sessionId)
                .orElseThrow(() -> new TimerNotFoundException(sessionId));

        if (session.getStatus() == Status.CANCELLED) {
            return TimerSessionMapper.toResponse(session);
        }

        session.setFinishedAt(now);
        if (workedSeconds != null) {
            session.setWorkedDuration(Duration.ofSeconds(Math.max(0, workedSeconds)));
        } else if (session.getStatus() == Status.RUNNING_WORK && session.getCurrentStartTime() != null) {
            addWorkedTime(session, now);
        }
        session.setStatus(Status.FINISHED);
        TimerSession saved = timerSessionRepo.save(session);
        scheduler.cancelFinish(saved.getId());
        return TimerSessionMapper.toResponse(saved);
    }

    @Transactional
    public TimerSessionResponse cancelTimer(Long sessionId) {
        return cancelTimer(sessionId, null);
    }

    @Transactional
    public TimerSessionResponse cancelTimer(Long sessionId, Long workedSeconds) {
        Instant now = Instant.now();
        User currentUser = currentUserService.getCurrentUser();
        TimerSession session = timerSessionRepo.findByIdAndUser(sessionId, currentUser)
                .orElseThrow(() -> new TimerNotFoundException(sessionId));

        if (session.getStatus() == Status.FINISHED) {
            return TimerSessionMapper.toResponse(session);
        }

        session.setFinishedAt(now);
        if (workedSeconds != null) {
            session.setWorkedDuration(Duration.ofSeconds(Math.max(0, workedSeconds)));
        } else if (session.getStatus() == Status.RUNNING_WORK && session.getCurrentStartTime() != null) {
            addWorkedTime(session, now);
        }
        session.setStatus(Status.CANCELLED);
        TimerSession saved = timerSessionRepo.save(session);
        scheduler.cancelFinish(saved.getId());
        return TimerSessionMapper.toResponse(saved);
    }

    @Transactional
    public TimerSessionResponse checkIfFinished(Long sessionId) {
        User currentUser = currentUserService.getCurrentUser();
        TimerSession session = timerSessionRepo.findByIdAndUser(sessionId, currentUser)
                .orElseThrow(() -> new TimerNotFoundException(sessionId));
        if (session.getStatus() == Status.RUNNING_WORK && Instant.now().isAfter(session.getExpectedFinishTime())) {
            return finishTimer(session.getId(), null);
        }
        return TimerSessionMapper.toResponse(session);
    }

    @Transactional
    public void deleteAllTimerSessions() {
        User currentUser = currentUserService.getCurrentUser();
        timerSessionRepo.deleteByUser(currentUser);
    }

    private static void addWorkedTime(TimerSession session, Instant now) {
        Duration previous = session.getWorkedDuration() != null ? session.getWorkedDuration() : Duration.ZERO;
        Duration currentWork = Duration.between(session.getCurrentStartTime(), now);
        session.setWorkedDuration(previous.plus(currentWork));
    }
}