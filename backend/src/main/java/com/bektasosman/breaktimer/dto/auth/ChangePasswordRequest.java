package com.bektasosman.breaktimer.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record ChangePasswordRequest(
        @NotBlank(message = "Aktuelles Passwort darf nicht leer sein")
        String currentPassword,

        @NotBlank(message = "Neues Passwort darf nicht leer sein")
        String newPassword
) {}