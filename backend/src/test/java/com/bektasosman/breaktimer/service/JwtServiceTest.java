package com.bektasosman.breaktimer.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.User;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

    private JwtService jwtService;
    private UserDetails testUser;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "secretKey", "dGhpcy1pcy1hLXNhbXBsZS1zZWNyZXQta2V5LWZvci1qd3QtdG9rZW4tc2lnbmluZy1wdXJwb3Nlcy0xMjM0NTY3OA");
        ReflectionTestUtils.setField(jwtService, "jwtExpiration", 86400000L);
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
