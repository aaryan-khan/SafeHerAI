package com.safeherai.backend.incident;

import com.safeherai.backend.common.ApiException;
import org.springframework.http.HttpStatus;

/**
 * The rectangle of map the phone is showing, in degrees.
 * Validated so one request can never ask for a whole country (or the whole world).
 */
public record BoundingBox(double minLon, double minLat, double maxLon, double maxLat) {

    /** About 110 km north-south: enough for a whole city, small enough to stay fast. */
    public static final double MAX_SPAN_DEGREES = 1.0;

    public static BoundingBox of(double minLon, double minLat, double maxLon, double maxLat) {
        if (!Double.isFinite(minLon) || !Double.isFinite(minLat)
                || !Double.isFinite(maxLon) || !Double.isFinite(maxLat)) {
            throw invalid("Coordinates must be numbers.");
        }
        if (minLon < -180 || maxLon > 180 || minLat < -90 || maxLat > 90) {
            throw invalid("Coordinates are outside the valid range.");
        }
        if (minLon >= maxLon || minLat >= maxLat) {
            throw invalid("minLon/minLat must be smaller than maxLon/maxLat.");
        }
        if (maxLon - minLon > MAX_SPAN_DEGREES || maxLat - minLat > MAX_SPAN_DEGREES) {
            throw invalid("This map area is too large. Zoom in and try again.");
        }
        return new BoundingBox(minLon, minLat, maxLon, maxLat);
    }

    private static ApiException invalid(String detail) {
        return new ApiException(HttpStatus.BAD_REQUEST, "Invalid map area", detail);
    }
}
