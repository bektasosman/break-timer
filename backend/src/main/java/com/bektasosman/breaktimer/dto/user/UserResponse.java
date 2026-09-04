package com.bektasosman.breaktimer.dto.user;

import lombok.Getter;


public record UserResponse(
        Long id,
        String email,
        String role
) {}
