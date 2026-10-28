package com.safeherai.backend.user;

/** Shared input rules, so every endpoint validates the same way. */
public final class ValidationRules {

    /** Letters (any language), numbers, spaces and . ' _ - only. Blocks HTML/script characters. */
    public static final String DISPLAY_NAME_PATTERN = "^[\\p{L}\\p{M}\\p{N} .'_-]+$";
    public static final int DISPLAY_NAME_MAX = 50;

    public static final int PASSWORD_MIN = 12;
    /** BCrypt only uses the first 72 bytes, so we refuse anything longer (see AuthService). */
    public static final int PASSWORD_MAX = 64;

    public static final int EMAIL_MAX = 254;

    private ValidationRules() {
    }
}