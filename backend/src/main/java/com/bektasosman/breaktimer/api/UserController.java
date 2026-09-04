package com.bektasosman.breaktimer.api;

import com.bektasosman.breaktimer.dto.user.UpdateUserRequest;
import com.bektasosman.breaktimer.dto.user.UserResponse;
import com.bektasosman.breaktimer.entities.User;
import com.bektasosman.breaktimer.exception.UserNotFoundException;
import com.bektasosman.breaktimer.repository.UserRepository;
import com.bektasosman.breaktimer.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository repository;
    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getCurrentUser() {
        return ResponseEntity.ok(userService.getCurrentUserProfile());
    }

    @PutMapping("/me")
    public ResponseEntity<UserResponse> updateCurrentUser(@Valid @RequestBody UpdateUserRequest request) {
        return ResponseEntity.ok(userService.updateCurrentUser(request));
    }

    @DeleteMapping("/me")
    public ResponseEntity<Void> deleteCurrentUser() {
        userService.deleteCurrentUser();
        return ResponseEntity.noContent().build();
    }
}