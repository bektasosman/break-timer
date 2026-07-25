package com.bektasosman.breaktimer.Schedule;

import com.bektasosman.breaktimer.entities.TimerSession;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;

@Service
public class TimerScheduler {

    private final TaskScheduler taskScheduler;
    private final Map<Long, ScheduledFuture<?>> scheduledTasks = new ConcurrentHashMap<>();

    public TimerScheduler(TaskScheduler scheduler) {
        this.taskScheduler = scheduler;
    }

    public void scheduleFinish(Long sessionId, Instant finishTime, Runnable task) {
        ScheduledFuture<?> future = taskScheduler.schedule(task, finishTime);
        scheduledTasks.put(sessionId, future);
    }

    public void cancelFinish(Long sessionId) {
        ScheduledFuture<?> future =
                scheduledTasks.remove(sessionId);

        if (future != null) {
            future.cancel(false);
        }
    }

}
