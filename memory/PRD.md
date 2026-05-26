# Shennell — PRD

## Overview
Shennell is a multi-agent AI platform with a bold, flirty-yet-ruthless host personality (Shennell)
who orchestrates up to 5 specialized mini-agents tailored to the user's needs.

## Audience
Founders, investors, creators, advocates — anyone who needs an elite specialist on-call.

## Core Features (MVP)
1. **Shennell main chat** — sweet, sexy, flirty but cut-throat AI commander (GPT-4o-mini).
2. **Squad Dashboard** — 5 agent slots displayed as luxe cards. Tap to chat, X to dismiss.
3. **Agent Templates** — 10 pre-built specialists:
   - Vesper (Finance & Crypto)
   - Rhea (Natural Healthcare)
   - Cipher (Developer)
   - Iris (Creative Designer + image gen)
   - Verdict (Lawyer & Judge)
   - Sable (Music Producer)
   - Atlas (Business Strategist)
   - Demeter (Food/FDA Advocate)
   - Onyx (Security Analyst)
   - Echo (Comms Analyst)
4. **Custom Agents** — user defines name, role, optional system prompt.
5. **Per-agent chat** — independent sessions with persisted history.
6. **Image generation** — for image-capable agents (Iris) via Gemini Nano Banana.
7. **Profile & Tiers** — Essential (free) / Elite ($19) / Empire ($49) — payments TBD.
8. **Local profile** — anonymous user_id via storage util. Reset wipes everything.

## Tech Stack
- Frontend: Expo Router + React Native (mobile + web preview)
- Backend: FastAPI + MongoDB
- LLM: Emergent LLM Key → OpenAI GPT-4o-mini + Gemini Nano Banana

## Future
- Stripe integration for tiered payments
- 3-hour movie / music video producer agent (long-form orchestration)
- FDA reform poster generator (Iris extension)
- Push notifications when agents complete async tasks
- Native auth (Google) for multi-device sync
