package com.bektasosman.breaktimer.repository;

import com.bektasosman.breaktimer.entities.TimerConfig;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TimerConfigRepository extends JpaRepository<TimerConfig, Long> {
}
