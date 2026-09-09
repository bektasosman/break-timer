package com.bektasosman.breaktimer.entities;

import com.bektasosman.breaktimer.Session.Status;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.Duration;
import java.time.Instant;

@Setter
@Getter
@Entity
@RequiredArgsConstructor
public class TimerSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private TimerConfig timerConfig;

    @Column(name = "config_name")
    private String configName;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private Instant currentStartTime;
    private Duration workedDuration;
    private Instant finishedAt;
    private Status status;
    private Instant expectedFinishTime;

}