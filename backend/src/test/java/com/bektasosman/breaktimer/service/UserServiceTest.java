package com.bektasosman.breaktimer.service;

import com.bektasosman.breaktimer.dto.auth.RegisterRequest;
import com.bektasosman.breaktimer.dto.user.UpdateUserRequest;
import com.bektasosman.breaktimer.dto.user.UserResponse;
import com.bektasosman.breaktimer.entities.User;
import com.bektasosman.breaktimer.exception.EmailAlreadyExistsException;
import com.bektasosman.breaktimer.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private TimerConfigService configService;

    @Mock
    private CurrentUserService currentUserService;

    @InjectMocks
    private UserService userService;

    private User sampleUser;

    @BeforeEach
    void setUp() {
        sampleUser = User.builder()
                .id(1L)
                .email("test@example.com")
                .password("encoded_pass")
                .role("USER")
                .build();
    }

    @Test
    void shouldCreateUserSuccessfully() {
        RegisterRequest request = new RegisterRequest("new@example.com", "password123");

        when(userRepository.existsByEmail("new@example.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("encoded_new");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            u.setId(2L);
            return u;
        });

        UserResponse response = userService.createUser(request);

        assertNotNull(response);
        assertEquals(2L, response.id());
        assertEquals("new@example.com", response.email());
        assertEquals("USER", response.role());

        verify(configService, times(1)).createDefaultConfigForUser(any(User.class));
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    void shouldThrowWhenCreatingUserWithExistingEmail() {
        RegisterRequest request = new RegisterRequest("existing@example.com", "password123");

        when(userRepository.existsByEmail("existing@example.com")).thenReturn(true);

        assertThrows(EmailAlreadyExistsException.class, () -> userService.createUser(request));
        verify(userRepository, never()).save(any(User.class));
        verify(configService, never()).createDefaultConfigForUser(any(User.class));
    }

    @Test
    void shouldGetCurrentUserProfile() {
        when(currentUserService.getCurrentUser()).thenReturn(sampleUser);

        UserResponse response = userService.getCurrentUserProfile();

        assertNotNull(response);
        assertEquals(sampleUser.getId(), response.id());
        assertEquals(sampleUser.getEmail(), response.email());
    }

    @Test
    void shouldUpdateCurrentUserSuccessfully() {
        UpdateUserRequest request = new UpdateUserRequest("updated@example.com");

        when(currentUserService.getCurrentUser()).thenReturn(sampleUser);
        when(userRepository.existsByEmail("updated@example.com")).thenReturn(false);
        when(userRepository.save(sampleUser)).thenReturn(sampleUser);

        UserResponse response = userService.updateCurrentUser(request);

        assertNotNull(response);
        assertEquals("updated@example.com", response.email());
        verify(userRepository).save(sampleUser);
    }

    @Test
    void shouldThrowWhenUpdatingToExistingEmail() {
        UpdateUserRequest request = new UpdateUserRequest("taken@example.com");

        when(currentUserService.getCurrentUser()).thenReturn(sampleUser);
        when(userRepository.existsByEmail("taken@example.com")).thenReturn(true);

        assertThrows(EmailAlreadyExistsException.class, () -> userService.updateCurrentUser(request));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void shouldDeleteCurrentUser() {
        when(currentUserService.getCurrentUser()).thenReturn(sampleUser);

        userService.deleteCurrentUser();

        verify(userRepository, times(1)).delete(sampleUser);
    }
}
