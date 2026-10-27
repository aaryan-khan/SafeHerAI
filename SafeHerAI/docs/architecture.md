# SafeHerAI Architecture

## Components

```
Mobile app (Expo) ──HTTPS+JWT──► Backend (Spring Boot) ──► PostgreSQL + PostGIS
      │                              │
      └──► map tiles (OpenFreeMap)   ├──► OpenRouteService (key on server only)
                                     ├──► Expo Push → FCM
                                     └──► AI service (FastAPI, internal only)
```

## Rules

1. The backend is the **only** public API. The mobile app holds no server secrets.
2. Emergency (SOS) features never depend on the AI service.
3. The SOS screen always offers on-device fallbacks (call 112, SMS composer)
   that work without our backend.
4. Notification status shown to users reflects real provider responses only.
5. The AI service uses public datasets, never users' personal data.
6. No part of the app claims an area or route is "safe".
7. Real alerts are disabled in development (`ALERTS_MODE=dry_run`).