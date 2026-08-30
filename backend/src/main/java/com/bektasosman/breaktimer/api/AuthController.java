package com.bektasosman.breaktimer.api;

import com.bektasosman.breaktimer.dto.auth.AuthResponse;
import com.bektasosman.breaktimer.dto.auth.ChangePasswordRequest;
import com.bektasosman.breaktimer.dto.auth.LoginRequest;
import com.bektasosman.breaktimer.dto.auth.RegisterRequest;
import com.bektasosman.breaktimer.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@CrossOrigin(origins = {"http://localhost:4200", "https://break-timer-app.onrender.com"})
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<String> register(@Valid @RequestBody RegisterRequest request) {
        String responseMessage = authService.register(request);
        return ResponseEntity.ok(responseMessage);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/change-password")
    public ResponseEntity<Void> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            Principal connectedUser
    ) {
        authService.changePassword(request, connectedUser);
        return ResponseEntity.ok().build();
    }
}