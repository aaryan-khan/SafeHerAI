# 0001 – Technology stack

**Status:** Accepted
**Context:** Beginner developer, MacBook Air M1, Android test device,
target region India, no paid services in development.

**Decision:**
- Mobile: React Native + Expo + TypeScript, Expo Router; MapLibre + OpenFreeMap (OSM).
- Backend: Java 21 LTS, Spring Boot 4.x, Spring Security, Spring Data JPA, Maven, Flyway.
- Database: PostgreSQL 17 + PostGIS 3.5 (Docker).
- AI: Python, FastAPI, pandas, scikit-learn (separate internal service).
- Routing: OpenRouteService (server-side key). Push: Expo Push via FCM.
- Single monorepo, single backend (no microservices).

**Why:** Long-term-support versions, free tooling, OSM-based maps with no API keys,
and the fewest moving parts a beginner can debug.

**Consequences:** MapLibre requires an Expo development build (from M4).
Java 22 (out of support) is not used.