package com.bektasosman.breaktimer.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.User;


import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

    private CustomUserDetailsService userService;
    private JwtService jwtService;
    private UserDetails testUser;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        testUser = User.builder()
                .username("osman@bektas.de")
                .password("dummyPassword")
                .authorities("ROLE_USER")
                .build();
    }

    @Test
    void shouldGenerateValidToken() {
        String token = jwtService.generateToken(testUser);
        assertNotNull(token);
        assertFalse(token.isEmpty());
    }

    @Test
    void shouldExtractCorrectUsernameFromToken() {
        String token = jwtService.generateToken(testUser);
        String email = jwtService.extractEmail(token);
        assertEquals("osman@bektas.de", email);
    }

    @Test
    void shouldValidateTokenCorrectly() {
        String token = jwtService.generateToken(testUser);
        boolean isValid = jwtService.isTokenValid(token, testUser);
        assertTrue(isValid);
    }
}