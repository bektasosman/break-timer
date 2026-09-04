package com.bektasosman.breaktimer.repository;

import com.bektasosman.breaktimer.entities.TimerConfig;
import com.bektasosman.breaktimer.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TimerConfigRepository extends JpaRepository<TimerConfig, Long> {

    List<TimerConfig> findByUser(User user);

    // Eine Config nur finden, wenn ID UND User übereinstimmen (Besitzschutz)
    Optional<TimerConfig> findByIdAndUser(Long id, User user);
}
