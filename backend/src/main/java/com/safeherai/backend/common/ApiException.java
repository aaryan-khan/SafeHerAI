package com.safeherai.backend.common;

import org.springframework.http.HttpStatus;

/**
 * An error we expect and want to show to the client with a safe, human-readable message.
 * Never put internal details (SQL, stack traces, other users' data) in the detail text.
 */
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String title;

    public ApiException(HttpStatus status, String title, String detail) {
        super(detail);
        this.status = status;
        this.title = title;
    }

    public HttpStatus getStatus() { return status; }
    public String getTitle() { return title; }
}