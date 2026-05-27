# Shennell — PRD

## Overview
Shennell is a multi-agent AI command ecosystem with a flirty-yet-ruthless host (Shennell)
who orchestrates up to 5 specialized mini-agents — either through 1:1 chat OR through
multi-step "Missions" that chain agents together for complex workflows.

## Audience
Founders, investors, creators, advocates — anyone who needs an elite specialist on-call.

## Core Features
1. **Shennell main chat** — sweet, sexy, flirty, cut-throat AI commander (GPT-4o-mini).
2. **Squad Dashboard** — 5 agent slots, luxe cards, color-coded.
3. **Canonical Agent Roster** (6 elite specialists):
   - 🔴 **LEXIS** — The Gavel (Legal Intelligence)
   - 🔵 **CIPHER** — The Shadow (Security & Defense)
   - 🟣 **NOVA** — The Director (Hollywood Creative + image gen)
   - 🟡 **AXIOM** — The Analyst (Financial & Crypto)
   - 🟢 **TERRA** — The Healer (Natural Health & FDA Reform)
   - 🟠 **SUNO** — The Composer (Music & Sonic Intelligence)
4. **Custom Agents** — user defines name, role, system prompt.
5. **Per-agent chat** — independent sessions with persisted history.
6. **Image generation** — for NOVA via Gemini Nano Banana.
7. **Mission Studio** — multi-agent orchestration. 5 presets:
   - 🟢 FDA Reform Awareness Pack (TERRA + NOVA + SUNO, 5 steps)
   - 🟣 Hollywood 3-Hour Production (NOVA + SUNO, 7 steps)
   - 🟠 Music Video Production (SUNO + NOVA, 4 steps)
   - 🟡 Crypto Portfolio Audit (AXIOM + CIPHER, 4 steps)
   - 🔴 Business Formation Pack (LEXIS + AXIOM + CIPHER, 4 steps)
   - Missions run async — frontend polls /api/missions/{id} every 4s for live updates.
8. **Stripe checkout** — Elite ($19/mo) and Empire ($49/mo) tiers via Emergent Stripe proxy.
9. **SUNO export** — converts music briefs to copy-paste prompts for Suno.ai/Udio.
10. **Local profile** — anonymous user_id via storage util.

## Tech Stack
- Frontend: Expo Router + React Native
- Backend: FastAPI + MongoDB + httpx (for Stripe proxy)
- LLM: Emergent LLM Key → GPT-4o-mini (text) + Gemini Nano Banana (image)
- Payments: Stripe via Emergent integrations proxy (sk_test_emergent)

## Future
- Stripe webhook for subscription lifecycle events (renewal, cancel)
- Tier gating: enforce 2-agent cap on Essential, image gen on Elite+
- Push notifications when async missions complete (Emergent push)
- Native auth (Google) for multi-device sync
- Real-time mission progress via WebSocket instead of polling
