package com.safeherai.backend.incident;

/** The kinds of incident a report can describe. Must match the CHECK constraint in V3. */
public enum IncidentCategory {
    HARASSMENT,
    STALKING,
    POOR_LIGHTING,
    UNSAFE_CROWD,
    OTHER
}
