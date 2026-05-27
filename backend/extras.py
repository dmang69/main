"""Mission orchestration + Stripe checkout + SUNO export endpoints.

Imported and mounted by server.py.
"""

from __future__ import annotations

import os
import uuid
import logging
from datetime import datetime, timezone
from typing import List, Optional

import stripe
import httpx
from urllib.parse import urlencode
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

# Route Stripe calls through the Emergent integrations proxy when configured
_proxy = os.environ.get("INTEGRATION_PROXY_URL") or os.environ.get("integration_proxy_url")
_stripe_base = f"{_proxy.rstrip('/')}/stripe" if _proxy else "https://api.stripe.com"


def _flatten_stripe_params(data: dict, parent_key: str = "") -> list:
    """Stripe expects form-encoded nested params like line_items[0][price_data][currency]=usd."""
    items = []
    for k, v in data.items():
        key = f"{parent_key}[{k}]" if parent_key else k
        if isinstance(v, dict):
            items.extend(_flatten_stripe_params(v, key))
        elif isinstance(v, list):
            for i, item in enumerate(v):
                if isinstance(item, dict):
                    items.extend(_flatten_stripe_params(item, f"{key}[{i}]"))
                else:
                    items.append((f"{key}[{i}]", str(item)))
        elif v is not None:
            items.append((key, str(v)))
    return items


async def _stripe_call(method: str, path: str, params: dict = None) -> dict:
    """Direct HTTP call to Stripe (or Emergent proxy)."""
    url = f"{_stripe_base}{path}"
    headers = {
        "Authorization": f"Bearer {stripe.api_key}",
        "Content-Type": "application/x-www-form-urlencoded",
    }
    flat = _flatten_stripe_params(params or {})
    body = urlencode(flat)
    async with httpx.AsyncClient(timeout=15) as client:
        if method == "POST":
            r = await client.post(url, headers=headers, content=body)
        else:
            r = await client.get(url, headers=headers)
    if r.status_code >= 400:
        try:
            err = r.json().get("error", {}).get("message", r.text)
        except Exception:
            err = r.text
        raise HTTPException(status_code=502, detail=f"Stripe error: {err}")
    return r.json()

# ===================== MISSION PRESETS =====================
# Each mission preset is a multi-step orchestration plan:
#  - Each step routes to a canonical agent (by template_key) with a focused brief.
#  - The system runs steps sequentially, feeding prior outputs as context.

MISSION_PRESETS = [
    {
        "key": "fda_awareness_pack",
        "name": "FDA Reform Awareness Pack",
        "tagline": "One-tap campaign: poster + petition + op-ed + anthem.",
        "agents": ["terra", "nova", "suno"],
        "color": "#7FB069",
        "icon": "leaf",
        "steps": [
            {"agent": "terra", "title": "Reform Brief", "prompt": "Write a 250-word activist brief on what's wrong with the current FDA & food system. Identify the 5 worst additives by name, the mechanism of harm for each, and the specific regulatory captures that allowed them. End with 3 concrete demands for reform."},
            {"agent": "terra", "title": "Petition Draft", "prompt": "Using the brief above as context, draft a Change.org-style petition (250 words) demanding the 3 reforms. Include 'WHEREAS' clauses and an emotional call to action."},
            {"agent": "terra", "title": "Op-Ed (700 words)", "prompt": "Write a sharp, persuasive 700-word op-ed for a major outlet (Atlantic / WSJ tone). Open with a hook, build the case with cited mechanisms, end with the reform demands."},
            {"agent": "nova", "title": "Poster Visual Concept", "prompt": "Design a single bold protest poster concept. Give: layout, color palette, key typography choice, central image, headline (max 8 words), supporting line. Then end with a single-paragraph IMAGE PROMPT ready to render — cinematic, high-contrast, defiant."},
            {"agent": "suno", "title": "Campaign Anthem", "prompt": "Compose a 2-minute campaign anthem. Provide: Title, Genre, BPM, Key, Structure (intro/verse/chorus/bridge/outro with bars), full lyrics, and a copy-paste prompt for Suno.ai/Udio."},
        ],
    },
    {
        "key": "hollywood_3hr",
        "name": "Hollywood 3-Hour Production",
        "tagline": "Full feature film blueprint, scene-by-scene.",
        "agents": ["nova", "suno"],
        "color": "#9B59B6",
        "icon": "film",
        "steps": [
            {"agent": "nova", "title": "Logline & Synopsis", "prompt": "Take the user's concept and produce: (1) a one-sentence logline, (2) a 200-word synopsis, (3) genre & tone, (4) target audience, (5) comparable films + why this is different. If no concept given, propose a powerful original one."},
            {"agent": "nova", "title": "Act I — Setup (60 min)", "prompt": "Break Act I into 8-10 scenes. For each scene: scene #, location, time of day, page count estimate, 2-3 sentence beat summary, key character moment, visual signature. End with the Inciting Incident and turn into Act II."},
            {"agent": "nova", "title": "Act II — Confrontation (90 min)", "prompt": "Break Act II into 14-18 scenes with the same format. Include the midpoint reversal, the all-is-lost moment, and the turn into Act III."},
            {"agent": "nova", "title": "Act III — Resolution (50 min)", "prompt": "Break Act III into 6-8 scenes. Climax, falling action, denouement. End with the final image."},
            {"agent": "nova", "title": "Character Bibles", "prompt": "Write 1-page bibles for the protagonist, antagonist, and 2 key supporting characters. Include: motivation, secret, arc, voice/dialogue style, visual signature."},
            {"agent": "nova", "title": "Cinematography Bible", "prompt": "Define the film's visual language: lens choices (focal lengths + why), lighting approach, color science (with hex anchors), camera movement philosophy, and 3 signature shots."},
            {"agent": "suno", "title": "Score & Soundtrack", "prompt": "Design the score. Identify the main theme (key, instrumentation, tempo), 4 character/place leitmotifs, and 6 needle-drop song slots with genre + emotional cue + suggested artist tier."},
        ],
    },
    {
        "key": "music_video",
        "name": "Music Video Production",
        "tagline": "Concept → song → shot list → finished cut plan.",
        "agents": ["suno", "nova"],
        "color": "#FF8C42",
        "icon": "musical-notes",
        "steps": [
            {"agent": "suno", "title": "The Song", "prompt": "Compose the song. Title, Genre, BPM, Key, Structure, full lyrics. Then provide a copy-paste prompt for Suno.ai/Udio."},
            {"agent": "nova", "title": "Video Concept", "prompt": "Using the song as context, design the music video concept: visual theme, color palette, narrative arc (or non-narrative motif), wardrobe direction, location list (3-5 settings)."},
            {"agent": "nova", "title": "Shot List", "prompt": "Write a complete shot list mapped to the song timecode. Format: [00:00-00:14] | SHOT # | Camera | Subject | Action | Notes. Cover the full song."},
            {"agent": "nova", "title": "Key Frame Visual", "prompt": "Describe one iconic key-frame visual that will be the poster/thumbnail. End with a render-ready IMAGE PROMPT."},
        ],
    },
    {
        "key": "crypto_audit",
        "name": "Crypto Portfolio Audit",
        "tagline": "Holdings → thesis → buy/sell calls → risk plan.",
        "agents": ["axiom", "cipher"],
        "color": "#D4AF37",
        "icon": "trending-up",
        "steps": [
            {"agent": "axiom", "title": "Macro Read", "prompt": "Give the current crypto macro read: BTC dominance, Fed/rates regime, ETF flow direction, dollar strength, key narratives this cycle (AI, RWAs, memes, L2s, etc). 200 words, decisive."},
            {"agent": "axiom", "title": "Position-by-Position", "prompt": "For each holding the user names, give: thesis (1-2 sentences), HOLD / TRIM / ADD / SELL call, entry/exit zones, % position size relative to portfolio. If they didn't name holdings, ask them to."},
            {"agent": "axiom", "title": "Rebalance Plan", "prompt": "Propose a target allocation: % crypto, % stables, % equities, % cash. Within crypto: BTC/ETH/alts/DeFi/memes split. Justify each weight."},
            {"agent": "cipher", "title": "Custody & Security Audit", "prompt": "Audit the user's custody posture. Recommend: hardware wallet model, multi-sig setup if balance > $50k, seed phrase backup protocol, exchange exposure limit, OPSEC for high-value addresses."},
        ],
    },
    {
        "key": "business_formation",
        "name": "Business Formation Pack",
        "tagline": "Entity → tax structure → contracts → security.",
        "agents": ["lexis", "axiom", "cipher"],
        "color": "#E63946",
        "icon": "briefcase",
        "steps": [
            {"agent": "lexis", "title": "Entity Selection", "prompt": "Recommend LLC vs S-Corp vs C-Corp vs nonprofit based on the user's business type, owner count, fundraising plans, and state. Compare tax treatment, liability, and admin burden. Give one recommendation with reasoning."},
            {"agent": "axiom", "title": "Tax & Finance Setup", "prompt": "Lay out the tax structure: estimated quarterly payments, S-corp salary vs distribution split (if relevant), retirement vehicles (Solo 401k, SEP, etc), bookkeeping stack recommendation."},
            {"agent": "lexis", "title": "Core Contract Bundle", "prompt": "List the minimum contracts needed: operating agreement, contractor MSA, NDA, customer ToS, privacy policy, IP assignment. Provide a brief outline of each — what clauses are critical."},
            {"agent": "cipher", "title": "Security Baseline", "prompt": "Define the minimum security stack: password manager, MFA on critical accounts, EDR for endpoints, backup strategy, incident response runbook outline."},
        ],
    },
]


def get_mission_preset(key: str) -> Optional[dict]:
    for m in MISSION_PRESETS:
        if m["key"] == key:
            return m
    return None


# ===================== MODELS =====================

class MissionLaunchRequest(BaseModel):
    user_id: str
    preset_key: str
    objective: str = ""  # user's specific brief — appended to each step


class MissionStepResult(BaseModel):
    step_index: int
    agent_key: str
    agent_name: str
    title: str
    output: str
    status: str = "complete"


class Mission(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    preset_key: str
    preset_name: str
    objective: str
    status: str = "pending"  # pending | running | complete | failed
    steps: List[MissionStepResult] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    completed_at: Optional[str] = None


class CheckoutSessionRequest(BaseModel):
    user_id: str
    plan: str  # "elite" | "empire"
    success_url: str
    cancel_url: str


# ===================== ROUTERS =====================

extras_router = APIRouter(prefix="/api")


def attach(db, run_chat_fn, agent_templates: list, shennell_system_prompt: str):
    """Wire up dependencies and return the router."""

    def get_template(key: str):
        for t in agent_templates:
            if t["key"] == key:
                return t
        return None

    # ===================== MISSIONS =====================

    @extras_router.get("/missions/presets")
    async def list_mission_presets():
        return [
            {
                "key": m["key"],
                "name": m["name"],
                "tagline": m["tagline"],
                "agents": m["agents"],
                "color": m["color"],
                "icon": m["icon"],
                "step_count": len(m["steps"]),
            }
            for m in MISSION_PRESETS
        ]

    @extras_router.post("/missions/launch", response_model=Mission)
    async def launch_mission(req: MissionLaunchRequest):
        preset = get_mission_preset(req.preset_key)
        if not preset:
            raise HTTPException(status_code=404, detail="Mission preset not found")

        mission = Mission(
            user_id=req.user_id,
            preset_key=req.preset_key,
            preset_name=preset["name"],
            objective=req.objective,
            status="running",
        )
        await db.missions.insert_one(mission.model_dump())

        # Execute steps sequentially, feeding prior output as context
        prior_outputs: List[str] = []
        try:
            for idx, step in enumerate(preset["steps"]):
                agent_template = get_template(step["agent"])
                if not agent_template:
                    raise HTTPException(status_code=500, detail=f"Agent template {step['agent']} not found")

                # Compose the prompt with the user's objective and prior outputs
                context_block = ""
                if req.objective:
                    context_block += f"\n\nUSER'S OBJECTIVE: {req.objective}"
                if prior_outputs:
                    context_block += "\n\nPRIOR MISSION OUTPUTS (use as context):\n" + "\n\n---\n\n".join(prior_outputs[-3:])

                full_prompt = step["prompt"] + context_block

                # Single-turn LLM call (history=[] keeps cost low)
                output = await run_chat_fn(
                    session_id=f"mission-{mission.id}-step-{idx}",
                    system_prompt=agent_template["system_prompt"],
                    history=[],
                    user_text=full_prompt,
                )

                step_result = MissionStepResult(
                    step_index=idx,
                    agent_key=step["agent"],
                    agent_name=agent_template["name"],
                    title=step["title"],
                    output=output,
                )
                mission.steps.append(step_result)
                prior_outputs.append(f"[{step_result.title} — {agent_template['name']}]\n{output}")

                # Persist progress after each step
                await db.missions.update_one(
                    {"id": mission.id},
                    {"$set": {"steps": [s.model_dump() for s in mission.steps]}},
                )

            mission.status = "complete"
            mission.completed_at = datetime.now(timezone.utc).isoformat()
            await db.missions.update_one(
                {"id": mission.id},
                {"$set": {"status": mission.status, "completed_at": mission.completed_at}},
            )
        except Exception as e:
            logger.exception(f"Mission {mission.id} failed: {e}")
            mission.status = "failed"
            await db.missions.update_one(
                {"id": mission.id},
                {"$set": {"status": "failed"}},
            )

        return mission

    @extras_router.get("/missions")
    async def list_missions(user_id: str):
        cursor = db.missions.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).limit(50)
        return await cursor.to_list(length=50)

    @extras_router.get("/missions/{mission_id}")
    async def get_mission(mission_id: str):
        doc = await db.missions.find_one({"id": mission_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Mission not found")
        return doc

    # ===================== STRIPE =====================

    @extras_router.get("/stripe/status")
    async def stripe_status(user_id: str):
        """Return the user's current subscription tier."""
        sub = await db.subscriptions.find_one({"user_id": user_id}, {"_id": 0})
        if not sub:
            return {"user_id": user_id, "plan": "essential", "status": "none"}
        return sub

    @extras_router.post("/stripe/checkout")
    async def create_checkout(req: CheckoutSessionRequest):
        if not stripe.api_key:
            raise HTTPException(status_code=500, detail="Stripe not configured on server")
        if req.plan not in ("elite", "empire"):
            raise HTTPException(status_code=400, detail="Plan must be 'elite' or 'empire'")

        # Hardcoded amounts (test mode). Prices in cents.
        prices = {
            "elite": {"amount": 1900, "name": "Shennell Elite — Full Squad"},
            "empire": {"amount": 4900, "name": "Shennell Empire — Power User"},
        }
        cfg = prices[req.plan]

        try:
            session = await _stripe_call("POST", "/v1/checkout/sessions", {
                "mode": "subscription",
                "line_items": [{
                    "quantity": 1,
                    "price_data": {
                        "currency": "usd",
                        "unit_amount": cfg["amount"],
                        "recurring": {"interval": "month"},
                        "product_data": {"name": cfg["name"]},
                    },
                }],
                "success_url": req.success_url + "?session_id={CHECKOUT_SESSION_ID}",
                "cancel_url": req.cancel_url,
                "client_reference_id": req.user_id,
                "metadata": {"user_id": req.user_id, "plan": req.plan},
            })
        except HTTPException:
            raise
        except Exception as e:
            logger.exception("Stripe checkout creation failed")
            raise HTTPException(status_code=502, detail=f"Stripe error: {e}")

        # Optimistically record intent
        await db.subscriptions.update_one(
            {"user_id": req.user_id},
            {
                "$set": {
                    "user_id": req.user_id,
                    "intended_plan": req.plan,
                    "checkout_session_id": session["id"],
                }
            },
            upsert=True,
        )
        return {"checkout_url": session["url"], "session_id": session["id"]}

    @extras_router.post("/stripe/verify")
    async def verify_checkout(session_id: str, user_id: str):
        """Frontend calls this after redirect back to confirm activation."""
        if not stripe.api_key:
            raise HTTPException(status_code=500, detail="Stripe not configured")
        try:
            session = await _stripe_call("GET", f"/v1/checkout/sessions/{session_id}")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Stripe error: {e}")

        if session.get("payment_status") == "paid" or session.get("status") == "complete":
            plan = (session.get("metadata") or {}).get("plan") or "elite"
            await db.subscriptions.update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        "user_id": user_id,
                        "plan": plan,
                        "status": "active",
                        "stripe_customer_id": session.get("customer"),
                        "stripe_subscription_id": session.get("subscription"),
                        "activated_at": datetime.now(timezone.utc).isoformat(),
                    }
                },
                upsert=True,
            )
            return {"plan": plan, "status": "active"}
        return {"plan": "essential", "status": session.get("status")}

    # ===================== SUNO EXPORT =====================

    @extras_router.post("/agents/{agent_id}/suno-export")
    async def suno_export(agent_id: str, request: Request):
        body = await request.json()
        user_id = body.get("user_id")
        message_text = body.get("text", "")
        if not message_text:
            raise HTTPException(status_code=400, detail="Missing 'text' to convert")

        agent = await db.agents.find_one({"id": agent_id}, {"_id": 0})
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")

        # Use the LLM to compress the message into a copy-paste-ready Suno/Udio prompt
        instruction = (
            "Convert the following music brief into a copy-paste-ready prompt for Suno.ai/Udio. "
            "Output ONLY two sections:\n\n"
            "STYLE TAGS (5-10 comma-separated tags): genre, mood, era, vocal style, instrumentation\n\n"
            "LYRICS (clean, formatted with [Verse], [Chorus], [Bridge] section labels):\n\n"
            "Input brief:\n" + message_text
        )

        try:
            export = await run_chat_fn(
                session_id=f"suno-export-{uuid.uuid4()}",
                system_prompt="You convert music briefs into platform-ready prompts for AI music generators.",
                history=[],
                user_text=instruction,
            )
        except Exception as e:
            logger.exception(f"Suno export failed: {e}")
            raise HTTPException(status_code=502, detail="Export failed")

        return {"export": export, "agent_id": agent_id, "user_id": user_id}

    return extras_router
