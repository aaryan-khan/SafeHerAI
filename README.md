# SafeHerAI

A women's safety app combining an interactive incident map, transparent
area indicators, route comparison, incident reporting with moderation,
trusted contacts, Safe Walk journey sharing, and an emergency SOS workflow.

> ⚠️ **Development status:** early development. Nothing here is ready for
> real-world use. SafeHerAI never guarantees that a place or route is safe.
> In an emergency in India, call **112**.

## Repository layout

| Folder | Purpose |
|---|---|
| `mobile/` | React Native + Expo app (TypeScript) |
| `backend/` | Spring Boot API: the only public API |
| `ai-service/` | Python FastAPI + scikit-learn (internal only) |
| `infra/` | Docker and local infrastructure files |
| `docs/` | Architecture, decisions, privacy, ML model card |
| `tests/e2e/` | End-to-end API tests |

## Milestone status

| # | Milestone | Status |
|---|---|---|
| M0 | Environment & repository setup | ✅ Done |
| M1 | Backend skeleton & database | ✅ Done |
| M2 | Authentication | ✅ Done |
| M3 | Mobile shell & auth screens | ⏳ Not started |
| M4 | Map & incidents (read) | ⏳ Not started |
| M5 | Reporting & moderation | ⏳ Not started |
| M6 | Area indicators | ⏳ Not started |
| M7 | Route comparison | ⏳ Not started |
| M8 | Trusted contacts & SOS (dry run) | ⏳ Not started |
| M9 | Safe Walk & notifications | ⏳ Not started |
| M10 | AI/ML service | ⏳ Not started |
| M11 | Hardening & release prep | ⏳ Not started |

## Prerequisites

- Java 21 (Temurin)
- Docker Desktop
- Node.js 24 LTS (mobile, from M3)
- Python 3.13/3.14 (AI service, from M10)

## Secrets

Copy `.env.example` to `.env` for local values. Never commit `.env`.