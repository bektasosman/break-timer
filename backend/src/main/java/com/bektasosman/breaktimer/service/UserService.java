package com.bektasosman.breaktimer.service;

import com.bektasosman.breaktimer.dto.auth.RegisterRequest;
import com.bektasosman.breaktimer.dto.user.UpdateUserRequest;
import com.bektasosman.breaktimer.dto.user.UserResponse;
import com.bektasosman.breaktimer.entities.User;
import com.bektasosman.breaktimer.exception.EmailAlreadyExistsException;
import com.bektasosman.breaktimer.mapper.UserMapper;
import com.bektasosman.breaktimer.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TimerConfigService configService;
    private final CurrentUserService currentUserService;

    public UserResponse createUser(RegisterRequest request){
        ensureEmailIsUnique(request.email());
        String encodedPassword = passwordEncoder.encode(request.password());
        User user = UserMapper.toEntity(request, encodedPassword);
        User savedUser = userRepository.save(user);
        configService.createDefaultConfigForUser(savedUser);
        return UserMapper.toResponse(savedUser);
    }

    private void ensureEmailIsUnique(String email) {
        if (userRepository.existsByEmail(email)) {
            throw new EmailAlreadyExistsException("E-Mail ist bereits vergeben: " + email);
        }
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrentUserProfile() {
        User user = currentUserService.getCurrentUser();
        return UserMapper.toResponse(user);
    }

    @Transactional
    public UserResponse updateCurrentUser(UpdateUserRequest request) {
        User user = currentUserService.getCurrentUser();
        if (!user.getEmail().equals(request.email()) && userRepository.existsByEmail(request.email())) {
            throw new EmailAlreadyExistsException(request.email());
        }
        user.setEmail(request.email());
        User updated = userRepository.save(user);
        return UserMapper.toResponse(updated);
    }

    @Transactional
    public void deleteCurrentUser() {
        User user = currentUserService.getCurrentUser();
        userRepository.delete(user);
    }

}
