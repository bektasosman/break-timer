package com.bektasosman.breaktimer.dto.auth;


import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record RegisterRequest(
        @NotBlank(message = "E-Mail darf nicht leer sein")
        @Email(message = "Ungültiges E-Mail-Format")
        String email,

        @NotBlank(message = "Passwort darf nicht leer sein")
        String password
) {}