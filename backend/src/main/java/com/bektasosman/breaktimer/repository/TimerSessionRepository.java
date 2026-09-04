package com.bektasosman.breaktimer.repository;

import com.bektasosman.breaktimer.entities.TimerSession;
import com.bektasosman.breaktimer.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TimerSessionRepository extends JpaRepository<TimerSession,Long> {
    List<TimerSession> findByUser(User user);
    Optional<TimerSession> findByIdAndUser(Long id, User user);
}
