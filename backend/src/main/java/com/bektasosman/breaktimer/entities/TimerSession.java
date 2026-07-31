package com.bektasosman.breaktimer.entities;

import com.bektasosman.breaktimer.Session.Status;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.Duration;
import java.time.Instant;
import java.util.Objects;

@Setter
@Getter
@Entity
public class TimerSession {

    @ManyToOne
    @OnDelete(action = OnDeleteAction.CASCADE)
    private TimerConfig timerConfig;

    private @Id
    @GeneratedValue
    Long sessionId;

    Instant currentStartTime;
    Duration workedDuration;
    Instant finishedAt;
    Status status;
    Instant expectedFinishTime;

    TimerSession(){

    }

    public TimerSession(Instant currentStartTime, Instant finishedAt, Status status, Duration workedDuration,Instant expectedFinishTime, TimerConfig timerConfig) {
        this.currentStartTime = currentStartTime;
        this.finishedAt = finishedAt;
        this.status = status;
        this.workedDuration = workedDuration;
        this.expectedFinishTime = expectedFinishTime;
        this.timerConfig = timerConfig;
    }


    @Override
    public boolean equals(Object o) {
        if (o == null || getClass() != o.getClass()) return false;
        TimerSession that = (TimerSession) o;
        return Objects.equals(sessionId, that.sessionId);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(sessionId);
    }
}
