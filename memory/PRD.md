# Shennell — PRD

## Overview
Shennell is a multi-agent AI command ecosystem with a flirty-yet-ruthless host (Shennell)
who orchestrates up to 5 specialized mini-agents drawn from an elite canonical roster.

## Audience
Founders, investors, creators, advocates — anyone who needs an elite specialist on-call.

## Core Features (MVP)
1. **Shennell main chat** — sweet, sexy, flirty but cut-throat AI commander (GPT-4o-mini).
   Knows her canonical roster and recommends optimal cross-agent missions.
2. **Squad Dashboard** — 5 agent slots displayed as luxe cards. Tap to chat, X to dismiss.
3. **Canonical Agent Roster** — 6 elite specialists (user picks any 5):
   - 🔴 **LEXIS** — The Gavel (Legal Intelligence)
   - 🔵 **CIPHER** — The Shadow (Security & Defense)
   - 🟣 **NOVA** — The Director (Hollywood Creative + image gen)
   - 🟡 **AXIOM** — The Analyst (Financial & Crypto)
   - 🟢 **TERRA** — The Healer (Natural Health & FDA Reform)
   - 🟠 **SUNO** — The Composer (Music & Sonic Intelligence)
4. **Cross-agent collaboration awareness** — Shennell knows e.g. NOVA + SUNO = music video,
   TERRA + NOVA + SUNO = FDA reform campaign, LEXIS + AXIOM = business formation, etc.
5. **Custom Agents** — user defines name, role, optional system prompt for niche needs.
6. **Per-agent chat** — independent sessions with persisted history.
7. **Image generation** — for NOVA via Gemini Nano Banana.
8. **Profile & Tiers** — Essential (free) / Elite ($19) / Empire ($49) — payments TBD.
9. **Local profile** — anonymous user_id via storage util. Reset wipes everything.

## Tech Stack
- Frontend: Expo Router + React Native (mobile + web preview)
- Backend: FastAPI + MongoDB
- LLM: Emergent LLM Key → OpenAI GPT-4o-mini + Gemini Nano Banana

## Future
- Stripe integration for tiered payments
- Long-form orchestration (3-hour movie pipelines as multi-step jobs in NOVA)
- FDA reform "Awareness Pack" — pre-built poster/petition templates triggered from TERRA
- SUNO direct integration with external AI music tools (Suno.ai, Udio) via prompt export
- Push notifications when async jobs complete
- Native auth (Google) for multi-device sync
