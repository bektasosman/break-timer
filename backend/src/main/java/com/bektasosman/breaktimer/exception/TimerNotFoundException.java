package com.bektasosman.breaktimer.exception;

public class TimerNotFoundException extends RuntimeException {
    public TimerNotFoundException(Long id) {
        super("Could not find Timer with Id. " + id);

    }
}
