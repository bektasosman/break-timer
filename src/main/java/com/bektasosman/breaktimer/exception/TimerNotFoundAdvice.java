package com.bektasosman.breaktimer.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class TimerNotFoundAdvice {

    @ExceptionHandler(TimerNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    String timerNotFoundHandler(TimerNotFoundException ex){
        return ex.getMessage();
    }
}
