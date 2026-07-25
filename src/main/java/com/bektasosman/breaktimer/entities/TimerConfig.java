package com.bektasosman.breaktimer.entities;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import lombok.Getter;
import lombok.Setter;

import java.time.Duration;
import java.util.Objects;

@Entity
@Setter
@Getter
public class TimerConfig {

    private @Id
    @GeneratedValue
    Long id;

    String name;
    Duration workDuration;
    Duration breakDuration;

    TimerConfig(){

    }

    public TimerConfig(String name, Duration workDuration, Duration breakDuration) {
        this.name = name;
        this.workDuration = workDuration;
        this.breakDuration = breakDuration;
    }

    @Override
    public String toString() {
        return "TimerConfig{" +
                "id=" + id +
                ", workDuration=" + workDuration +
                ", breakDuration=" + breakDuration +
                '}';
    }

    @Override
    public boolean equals(Object o) {
        if (o == null || getClass() != o.getClass()) return false;
        TimerConfig that = (TimerConfig) o;
        return workDuration == that.workDuration && breakDuration == that.breakDuration && Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, workDuration, breakDuration);
    }
}

