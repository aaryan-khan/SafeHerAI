package com.safeherai.backend.area;

/**
 * How much there is to go on. Deliberately says nothing about safety:
 * NONE does not mean "safe", it means "nobody has reported anything here".
 */
public enum DataLevel {
    /** No reports. */
    NONE,
    /** 1–4 reports: too few to see any pattern. */
    LIMITED,
    /** 5 or more reports. */
    SOME;

    static final int SOME_FROM = 5;

    public static DataLevel of(int reports) {
        if (reports == 0) return NONE;
        return reports < SOME_FROM ? LIMITED : SOME;
    }
}
