package com.bektasosman.breaktimer.service;


import com.bektasosman.breaktimer.dto.auth.AuthResponse;
import com.bektasosman.breaktimer.dto.auth.ChangePasswordRequest;
import com.bektasosman.breaktimer.dto.auth.LoginRequest;
import com.bektasosman.breaktimer.dto.auth.RegisterRequest;
import com.bektasosman.breaktimer.dto.user.UserResponse;
import com.bektasosman.breaktimer.entities.User;
import com.bektasosman.breaktimer.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.security.Principal;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final CustomUserDetailsService userDetailsService;
    private final PasswordEncoder passwordEncoder;
    private final UserService userService;

    @Transactional
    public String register(RegisterRequest request) {
        UserResponse createdUser = userService.createUser(request);
        return "Benutzer" + createdUser.email() + "erfolgreich registriert!";
    }

    public AuthResponse login(LoginRequest request) {
        Authentication authenticate = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.email(),
                        request.password()
                )
        );
        UserDetails user =(UserDetails) authenticate.getPrincipal();
        String token = jwtService.generateToken(user);
        return new AuthResponse(token, user.getUsername());
    }

    public void changePassword(ChangePasswordRequest request, Principal connectedUser) {
        if (connectedUser == null) {
            throw new IllegalStateException("Kein angemeldeter Benutzer übergeben.");
        }

        var user = (User) ((UsernamePasswordAuthenticationToken) connectedUser).getPrincipal();

        // 1. Prüfen, ob User oder Passwörter null sind
        if (user == null || user.getPassword() == null || request.currentPassword() == null) {
            throw new IllegalStateException("Ungültige Benutzer- oder Passwort-Daten.");
        }

        // 2. Altes Passwort abgleichen
        if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
            throw new IllegalStateException("Falsches Passwort!");
        }

        // 3. Neues Passwort hashen und speichern
        user.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
    }
}
