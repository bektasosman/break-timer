package com.bektasosman.breaktimer.service;

import com.bektasosman.breaktimer.dto.auth.AuthResponse;
import com.bektasosman.breaktimer.dto.auth.ChangePasswordRequest;
import com.bektasosman.breaktimer.dto.auth.LoginRequest;
import com.bektasosman.breaktimer.dto.auth.RegisterRequest;
import com.bektasosman.breaktimer.dto.user.UserResponse;
import com.bektasosman.breaktimer.entities.User;
import com.bektasosman.breaktimer.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.security.Principal;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtService jwtService;

    @Mock
    private CustomUserDetailsService userDetailsService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private UserService userService;

    @InjectMocks
    private AuthService authService;

    @Test
    void shouldRegisterUserSuccessfully() {
        RegisterRequest request = new RegisterRequest("test@example.com", "pass123");
        when(userService.createUser(request)).thenReturn(new UserResponse(1L, "test@example.com", "ROLE_USER"));

        String result = authService.register(request);

        assertNotNull(result);
        assertTrue(result.contains("test@example.com"));
        verify(userService).createUser(request);
    }

    @Test
    void shouldLoginSuccessfully() {
        LoginRequest request = new LoginRequest("test@example.com", "pass123");
        UserDetails mockUserDetails = org.springframework.security.core.userdetails.User.builder()
                .username("test@example.com")
                .password("pass123")
                .authorities("ROLE_USER")
                .build();

        when(userDetailsService.loadUserByUsername("test@example.com")).thenReturn(mockUserDetails);
        when(jwtService.generateToken(mockUserDetails)).thenReturn("mock-token-xyz");

        AuthResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals("mock-token-xyz", response.token());
        assertEquals("test@example.com", response.email());
        verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
    }

    @Test
    void shouldThrowWhenLoginWithBadCredentials() {
        LoginRequest request = new LoginRequest("test@example.com", "wrongpass");
        doThrow(new BadCredentialsException("Bad credentials"))
                .when(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));

        assertThrows(BadCredentialsException.class, () -> authService.login(request));
        verify(jwtService, never()).generateToken(any());
    }

    @Test
    void shouldChangePasswordSuccessfully() {
        ChangePasswordRequest request = new ChangePasswordRequest("currentPass", "newPass");
        User user = User.builder()
                .id(1L)
                .email("user@example.com")
                .password("encodedCurrentPass")
                .build();

        Principal principal = new UsernamePasswordAuthenticationToken(user, null);

        when(passwordEncoder.matches("currentPass", "encodedCurrentPass")).thenReturn(true);
        when(passwordEncoder.encode("newPass")).thenReturn("encodedNewPass");

        authService.changePassword(request, principal);

        assertEquals("encodedNewPass", user.getPassword());
        verify(userRepository).save(user);
    }

    @Test
    void shouldThrowWhenChangingPasswordWithWrongCurrentPassword() {
        ChangePasswordRequest request = new ChangePasswordRequest("wrongCurrentPass", "newPass");
        User user = User.builder()
                .id(1L)
                .email("user@example.com")
                .password("encodedCurrentPass")
                .build();

        Principal principal = new UsernamePasswordAuthenticationToken(user, null);

        when(passwordEncoder.matches("wrongCurrentPass", "encodedCurrentPass")).thenReturn(false);

        assertThrows(IllegalStateException.class, () -> authService.changePassword(request, principal));
        verify(userRepository, never()).save(any());
    }
}
