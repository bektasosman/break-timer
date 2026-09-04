package com.bektasosman.breaktimer.service;

import com.bektasosman.breaktimer.entities.User;
import com.bektasosman.breaktimer.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CurrentUserService {

    private final UserRepository userRepository;

    public User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new IllegalStateException("Zugriff verweigert: Kein angemeldeter Benutzer.");
        }

        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new EntityNotFoundException("Benutzer nicht gefunden"));
    }
}