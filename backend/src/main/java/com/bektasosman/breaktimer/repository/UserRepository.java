package com.bektasosman.breaktimer.repository;

import com.bektasosman.breaktimer.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
}
