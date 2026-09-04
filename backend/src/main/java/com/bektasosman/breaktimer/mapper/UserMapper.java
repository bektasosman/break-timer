package com.bektasosman.breaktimer.mapper;

import com.bektasosman.breaktimer.dto.auth.RegisterRequest;
import com.bektasosman.breaktimer.dto.user.UserResponse;
import com.bektasosman.breaktimer.entities.User;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public class UserMapper {

    public static User toEntity(RegisterRequest dto, String encodedPassword) {
        User user = new User();
        user.setEmail(dto.email());
        user.setPassword(encodedPassword);
        user.setRole("USER");
        return user;
    }

    public static UserResponse toResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getRole()
        );
    }
}