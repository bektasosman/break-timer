package com.bektasosman.breaktimer.exception;

public class UserNotFoundException extends RuntimeException {
    public UserNotFoundException(Long id) {
        super("Could not find User with Id. " + id);
    }
}
