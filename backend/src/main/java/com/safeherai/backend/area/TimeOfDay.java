package com.safeherai.backend.area;

/** Parts of the day in Indian Standard Time, used to group reports by when they happened. */
public enum TimeOfDay {
    /** 05:00–11:59 */
    MORNING,
    /** 12:00–16:59 */
    AFTERNOON,
    /** 17:00–20:59 */
    EVENING,
    /** 21:00–04:59 */
    NIGHT;

    public static TimeOfDay ofHour(int hour) {
        if (hour >= 5 && hour < 12) return MORNING;
        if (hour >= 12 && hour < 17) return AFTERNOON;
        if (hour >= 17 && hour < 21) return EVENING;
        return NIGHT;
    }
}
