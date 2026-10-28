package com.safeherai.backend.security;

import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

/**
 * Writes small fixed JSON error bodies from security filters, which run before
 * our controllers and so can't use GlobalExceptionHandler.
 * The texts are constants: no user input is ever inserted.
 */
final class ProblemResponses {

    private ProblemResponses() {
    }

    static void write(HttpServletResponse response, int status, String title, String detail) throws IOException {
        response.setStatus(status);
        response.setContentType("application/problem+json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(
                "{\"type\":\"about:blank\",\"title\":\"" + title + "\",\"status\":" + status
                        + ",\"detail\":\"" + detail + "\"}");
    }
}