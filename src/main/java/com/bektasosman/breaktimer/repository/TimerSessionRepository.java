package com.bektasosman.breaktimer.repository;

import com.bektasosman.breaktimer.entities.TimerSession;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TimerSessionRepository extends JpaRepository<TimerSession,Long> {
}
