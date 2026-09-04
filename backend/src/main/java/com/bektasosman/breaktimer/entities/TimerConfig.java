package com.bektasosman.breaktimer.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.Duration;
import java.util.Objects;

@Entity
@Setter
@Getter
@RequiredArgsConstructor
public class TimerConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    String name;
    Duration workDuration;
    Duration breakDuration;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
}

