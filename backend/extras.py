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
        "category": "health",
        "badge": "popular",
        "color": "#10B981",
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
        "category": "creative",
        "badge": "premium",
        "color": "#9333EA",
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
        "category": "music",
        "badge": "popular",
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
        "category": "finance",
        "badge": "popular",
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
        "category": "crossover",
        "badge": "premium",
        "color": "#E63946",
        "icon": "briefcase",
        "steps": [
            {"agent": "lexis", "title": "Entity Selection", "prompt": "Recommend LLC vs S-Corp vs C-Corp vs nonprofit based on the user's business type, owner count, fundraising plans, and state. Compare tax treatment, liability, and admin burden. Give one recommendation with reasoning."},
            {"agent": "axiom", "title": "Tax & Finance Setup", "prompt": "Lay out the tax structure: estimated quarterly payments, S-corp salary vs distribution split (if relevant), retirement vehicles (Solo 401k, SEP, etc), bookkeeping stack recommendation."},
            {"agent": "lexis", "title": "Core Contract Bundle", "prompt": "List the minimum contracts needed: operating agreement, contractor MSA, NDA, customer ToS, privacy policy, IP assignment. Provide a brief outline of each — what clauses are critical."},
            {"agent": "cipher", "title": "Security Baseline", "prompt": "Define the minimum security stack: password manager, MFA on critical accounts, EDR for endpoints, backup strategy, incident response runbook outline."},
        ],
    },
    # ========== NEW MISSIONS ==========
    {
        "key": "court_case_builder",
        "name": "Court Case Builder",
        "tagline": "Theory → evidence map → motions → trial brief.",
        "agents": ["lexis"],
        "category": "legal",
        "badge": "premium",
        "color": "#E63946",
        "icon": "hammer",
        "steps": [
            {"agent": "lexis", "title": "Case Theory", "prompt": "From the user's facts, build the case theory: cause(s) of action, elements that must be proven, theory of liability or defense, narrative arc the jury will hear."},
            {"agent": "lexis", "title": "Evidence Map", "prompt": "Map each element of the case to the specific evidence needed (documents, witnesses, exhibits). Identify gaps and discovery requests to fill them."},
            {"agent": "lexis", "title": "Motion Strategy", "prompt": "Recommend pre-trial motions to file (motion to dismiss, summary judgment, motions in limine). For each: purpose, key argument, controlling rule, likelihood of success."},
            {"agent": "lexis", "title": "Trial Brief Outline", "prompt": "Draft a trial brief outline: jurisdiction, parties, statement of facts, argument sections with controlling case law, requested relief. Include suggested jury instructions."},
        ],
    },
    {
        "key": "lawsuit_timeline",
        "name": "Lawsuit Timeline Generator",
        "tagline": "From filing to verdict — every deadline mapped.",
        "agents": ["lexis"],
        "category": "legal",
        "badge": "fast",
        "color": "#E63946",
        "icon": "calendar",
        "steps": [
            {"agent": "lexis", "title": "Phase Map", "prompt": "Map the full lawsuit timeline by phase: pre-suit, pleading, discovery, motion practice, pre-trial, trial, post-trial, appeal. For each phase give typical duration and key milestones."},
            {"agent": "lexis", "title": "Critical Deadlines", "prompt": "List every critical deadline a litigant must hit (statute of limitations, answer date, discovery cutoffs, dispositive motion deadline, expert disclosures, pretrial order). Reference FRCP/state rule where applicable."},
            {"agent": "lexis", "title": "Risk Calendar", "prompt": "Identify the 5 highest-risk moments in the timeline where most cases are won or lost. Give defensive playbook for each."},
        ],
    },
    {
        "key": "business_launch_kit",
        "name": "Business Launch Kit",
        "tagline": "GTM + brand + legal + finance — full launch package.",
        "agents": ["axiom", "lexis", "nova", "cipher"],
        "category": "crossover",
        "badge": "premium",
        "color": "#D4AF37",
        "icon": "rocket",
        "steps": [
            {"agent": "axiom", "title": "Market Validation", "prompt": "Validate the market opportunity: TAM/SAM/SOM, top 3 competitors, pricing strategy, unit economics, break-even timeline."},
            {"agent": "nova", "title": "Brand Identity Brief", "prompt": "Design the brand: name vibe, color palette (5 hexes), typography pair, logo concept, brand voice (3 adjectives), tagline options (5)."},
            {"agent": "lexis", "title": "Legal Setup", "prompt": "Provide the day-1 legal checklist: entity formation, EIN, trademark search, IP assignment, NDAs, contractor agreements, terms of service, privacy policy."},
            {"agent": "axiom", "title": "Launch Financial Plan", "prompt": "Build the 90-day financial plan: starting capital allocation, monthly burn forecast, revenue milestones, fundraising readiness checklist."},
            {"agent": "cipher", "title": "Security Foundation", "prompt": "Set up day-1 security: domain protection, MFA-everywhere policy, password manager rollout, cloud security baselines, incident response contact list."},
            {"agent": "nova", "title": "Launch Campaign", "prompt": "Plan the launch campaign: announcement copy for 5 platforms (X, LinkedIn, IG, YouTube, email), launch day timeline, asset checklist, KPIs to track week 1-4."},
        ],
    },
    {
        "key": "grant_funding",
        "name": "Grant & Funding Pack",
        "tagline": "Find grants. Write applications. Win money.",
        "agents": ["axiom", "lexis"],
        "category": "finance",
        "badge": "advanced",
        "color": "#D4AF37",
        "icon": "cash",
        "steps": [
            {"agent": "axiom", "title": "Funding Opportunities", "prompt": "Identify 10 funding sources matched to the user's project: federal grants, state grants, foundation grants, contests, accelerators, angel networks. For each: amount range, deadline pattern, fit rationale, URL to research."},
            {"agent": "axiom", "title": "Budget Narrative", "prompt": "Draft a grant-ready budget narrative: total ask, line-item breakdown (personnel, equipment, overhead, contractor, travel), justification per line, matching funds plan."},
            {"agent": "lexis", "title": "Application Boilerplate", "prompt": "Write reusable application boilerplate: organizational background, leadership bios, mission statement, theory of change, evaluation methodology, sustainability plan. All grant-application-ready."},
        ],
    },
    {
        "key": "personal_brand",
        "name": "Personal Brand Campaign",
        "tagline": "Position → content engine → growth playbook.",
        "agents": ["nova", "suno"],
        "category": "creative",
        "badge": "popular",
        "color": "#9333EA",
        "icon": "person-circle",
        "steps": [
            {"agent": "nova", "title": "Positioning", "prompt": "Build the positioning: 3-word identity, niche, target audience, unique angle, key promise, content pillars (3-5)."},
            {"agent": "nova", "title": "Visual Identity", "prompt": "Design the personal visual identity: signature color, font, photo direction (lighting, mood, settings), thumbnail style for video platforms, IG grid aesthetic. End with one render-ready image prompt for a hero photo concept."},
            {"agent": "nova", "title": "Content Engine (30-day)", "prompt": "Build a 30-day content calendar: 4 posts/week across LinkedIn, X, IG, YouTube Shorts. For each post: hook, body, CTA, asset type. Vary across pillars."},
            {"agent": "suno", "title": "Signature Sound", "prompt": "Compose a 10-second audio logo / show theme for the personal brand. Title, genre, BPM, instrumentation, full description + Suno/Udio prompt."},
        ],
    },
    {
        "key": "crypto_risk_shield",
        "name": "Crypto Risk Shield",
        "tagline": "Liquidations, scams, custody — defended.",
        "agents": ["axiom", "cipher"],
        "category": "finance",
        "badge": "advanced",
        "color": "#1FB6FF",
        "icon": "shield-checkmark",
        "steps": [
            {"agent": "axiom", "title": "Liquidation Math", "prompt": "Audit user's leverage exposure: liquidation prices, max drawdown survivable, recommended de-risk levels per market regime. Include stop-loss matrix."},
            {"agent": "cipher", "title": "Scam Vector Audit", "prompt": "Identify the top 10 scam vectors in crypto today (ice phishing, address poisoning, fake airdrops, malicious dApps, support impersonators, etc). For each: how it works, red flags, defense."},
            {"agent": "cipher", "title": "Custody Hardening", "prompt": "Design hardened custody: cold storage architecture, multi-sig (which threshold), passphrase strategy, geographic seed split, social recovery option, dead-man switch."},
            {"agent": "axiom", "title": "Black-Swan Plan", "prompt": "Plan for black-swan scenarios: exchange insolvency, stablecoin depeg, smart-contract exploit, regulatory crackdown. Specific moves for each."},
        ],
    },
    {
        "key": "emergency_legal",
        "name": "Emergency Legal Response",
        "tagline": "Right now. What to say. What to do. What NOT to.",
        "agents": ["lexis", "cipher"],
        "category": "legal",
        "badge": "emergency",
        "color": "#FF4D6D",
        "icon": "warning",
        "steps": [
            {"agent": "lexis", "title": "Triage", "prompt": "From the user's emergency, triage: what's the legal threat (criminal, civil, regulatory, contractual)? Time-sensitive deadlines? Jurisdiction? Whose rights are at stake? Output a one-page triage memo."},
            {"agent": "lexis", "title": "Do / Don't List", "prompt": "Give a do-now / do-not-do checklist for the next 24 hours. Be specific. Cover communications, document preservation, witness contact, social media, third-party notifications."},
            {"agent": "cipher", "title": "Evidence Preservation", "prompt": "Protocol to preserve evidence digitally: which files to hash + timestamp, chain of custody, email/chat archival, photo/video metadata preservation, cloud snapshot strategy."},
            {"agent": "lexis", "title": "Counsel Brief", "prompt": "Draft a one-page brief the user can hand to an attorney: facts, timeline, parties, evidence inventory, immediate threats, requested representation scope."},
        ],
    },
    {
        "key": "social_blitz",
        "name": "Social Media Blitz",
        "tagline": "5 platforms. 7 days. Maximum reach.",
        "agents": ["nova", "suno"],
        "category": "creative",
        "badge": "fast",
        "color": "#FF2D9F",
        "icon": "megaphone",
        "steps": [
            {"agent": "nova", "title": "Campaign Concept", "prompt": "Design a 7-day blitz campaign: theme, hook, hashtag, narrative arc by day, target metric (reach / leads / sales)."},
            {"agent": "nova", "title": "Platform Plays", "prompt": "Tailor the concept to each platform: X (5 threads + 10 single posts), LinkedIn (3 long-form), IG (7 reels + 5 carousels), TikTok (7 short videos), YouTube Shorts (5). Give hook + script for each."},
            {"agent": "suno", "title": "Background Soundtrack", "prompt": "Recommend 3 royalty-free soundtrack vibes for the videos. Give exact BPM, energy curve, where each fits in the campaign. Then write one custom Suno/Udio prompt for an original track."},
        ],
    },
    {
        "key": "investor_pitch",
        "name": "Investor Pitch Pack",
        "tagline": "Deck + memo + model + Q&A prep.",
        "agents": ["axiom", "nova", "lexis"],
        "category": "finance",
        "badge": "premium",
        "color": "#D4AF37",
        "icon": "trending-up",
        "steps": [
            {"agent": "axiom", "title": "Investment Thesis", "prompt": "Crystallize the investment thesis: problem, solution, why now, why us, market size, traction, unit economics, projections (3-year), use of funds. Sharp and quantitative."},
            {"agent": "nova", "title": "Deck Outline (12 slides)", "prompt": "Outline the 12-slide pitch deck. For each slide: title, key message, 3-5 bullet contents, visual concept, speaker notes (30s of talk track)."},
            {"agent": "axiom", "title": "Financial Model Summary", "prompt": "Summarize the financial model: revenue model, key drivers, base/bull/bear forecasts, gross margin trajectory, CAC/LTV/payback, runway scenarios with the proposed raise."},
            {"agent": "lexis", "title": "Investor Q&A Prep", "prompt": "Anticipate the top 20 investor questions (across team, market, product, GTM, financials, competition, IP, legal). Provide a tight 60-second answer for each."},
        ],
    },
    {
        "key": "doc_analyzer",
        "name": "Document Analyzer Mission",
        "tagline": "Drop a contract or doc. Get the truth.",
        "agents": ["lexis"],
        "category": "legal",
        "badge": "fast",
        "color": "#C9CCD3",
        "icon": "document-text",
        "steps": [
            {"agent": "lexis", "title": "Plain-English Summary", "prompt": "From the user's pasted document (in the objective), produce a 5-bullet plain-English summary: who, what, when, how much, what happens if breached."},
            {"agent": "lexis", "title": "Risk & Leverage Analysis", "prompt": "Identify the 5 most dangerous clauses to the user and the 5 best leverage points. For each: clause language, why it matters, recommended redline."},
            {"agent": "lexis", "title": "Counter-Proposal", "prompt": "Draft a markup/counter-proposal: redlines (additions/deletions), justification per change, fallback positions. Output as a clean redlined version + a negotiation memo."},
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


class CustomMissionLaunchRequest(BaseModel):
    user_id: str
    name: str
    objective: str
    agent_keys: List[str]  # e.g. ["lexis", "cipher"] for agent fusion
    tone: str = ""         # e.g. "aggressive", "diplomatic", "neutral"
    output_type: str = ""  # e.g. "brief", "outline", "full document"
    priority: str = "standard"  # standard | high | emergency


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
                "category": m.get("category", "crossover"),
                "badge": m.get("badge"),
                "color": m["color"],
                "icon": m["icon"],
                "step_count": len(m["steps"]),
            }
            for m in MISSION_PRESETS
        ]

    @extras_router.post("/missions/launch", response_model=Mission)
    async def launch_mission(req: MissionLaunchRequest):
        import asyncio
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

        async def execute_in_background(mission_id: str, preset_def: dict, objective: str):
            prior_outputs: List[str] = []
            executed_steps: List[MissionStepResult] = []
            try:
                for idx, step in enumerate(preset_def["steps"]):
                    agent_template = get_template(step["agent"])
                    if not agent_template:
                        continue
                    context_block = ""
                    if objective:
                        context_block += f"\n\nUSER'S OBJECTIVE: {objective}"
                    if prior_outputs:
                        context_block += "\n\nPRIOR MISSION OUTPUTS (use as context):\n" + "\n\n---\n\n".join(prior_outputs[-3:])
                    full_prompt = step["prompt"] + context_block

                    output = await run_chat_fn(
                        session_id=f"mission-{mission_id}-step-{idx}",
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
                    executed_steps.append(step_result)
                    prior_outputs.append(f"[{step_result.title} — {agent_template['name']}]\n{output}")

                    await db.missions.update_one(
                        {"id": mission_id},
                        {"$set": {"steps": [s.model_dump() for s in executed_steps]}},
                    )

                await db.missions.update_one(
                    {"id": mission_id},
                    {"$set": {"status": "complete", "completed_at": datetime.now(timezone.utc).isoformat()}},
                )
            except Exception as e:
                logger.exception(f"Mission {mission_id} failed: {e}")
                await db.missions.update_one(
                    {"id": mission_id},
                    {"$set": {"status": "failed"}},
                )

        # Fire-and-forget; client polls /api/missions/{id} for progress
        asyncio.create_task(execute_in_background(mission.id, preset, req.objective))

        return mission

    @extras_router.get("/missions")
    async def list_missions(user_id: str):
        cursor = db.missions.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).limit(50)
        return await cursor.to_list(length=50)

    @extras_router.post("/missions/custom", response_model=Mission)
    async def launch_custom_mission(req: CustomMissionLaunchRequest):
        """Agent Fusion / custom multi-agent mission."""
        import asyncio
        if not req.agent_keys:
            raise HTTPException(status_code=400, detail="Pick at least one agent")
        # Validate agents
        chosen = []
        for k in req.agent_keys:
            t = get_template(k)
            if not t:
                raise HTTPException(status_code=400, detail=f"Unknown agent: {k}")
            chosen.append(t)

        tone_clause = f" Tone: {req.tone}." if req.tone else ""
        output_clause = f" Deliver as: {req.output_type}." if req.output_type else ""
        priority_clause = " URGENT — prioritize speed over polish." if req.priority == "emergency" else ""

        mission = Mission(
            user_id=req.user_id,
            preset_key="custom",
            preset_name=req.name or "Custom Mission",
            objective=req.objective,
            status="running",
        )
        await db.missions.insert_one(mission.model_dump())

        async def execute_custom(mid: str, agents: list, objective: str):
            executed: List[MissionStepResult] = []
            prior_outputs: List[str] = []
            try:
                for idx, agent_template in enumerate(agents):
                    if prior_outputs:
                        context = "\n\nPRIOR AGENT OUTPUT:\n" + "\n\n---\n\n".join(prior_outputs[-2:])
                    else:
                        context = ""
                    prompt = (
                        f"MISSION OBJECTIVE: {objective}{tone_clause}{output_clause}{priority_clause}"
                        f"{context}\n\n"
                        f"Apply YOUR specialty to this mission. Be specific, decisive, and complete."
                    )
                    output = await run_chat_fn(
                        session_id=f"custom-mission-{mid}-step-{idx}",
                        system_prompt=agent_template["system_prompt"],
                        history=[],
                        user_text=prompt,
                    )
                    step_result = MissionStepResult(
                        step_index=idx,
                        agent_key=agent_template["key"],
                        agent_name=agent_template["name"],
                        title=f"{agent_template['name']}'s analysis",
                        output=output,
                    )
                    executed.append(step_result)
                    prior_outputs.append(f"[{agent_template['name']}]\n{output}")
                    await db.missions.update_one(
                        {"id": mid},
                        {"$set": {"steps": [s.model_dump() for s in executed]}},
                    )
                await db.missions.update_one(
                    {"id": mid},
                    {"$set": {"status": "complete", "completed_at": datetime.now(timezone.utc).isoformat()}},
                )
            except Exception as e:
                logger.exception(f"Custom mission {mid} failed: {e}")
                await db.missions.update_one({"id": mid}, {"$set": {"status": "failed"}})

        asyncio.create_task(execute_custom(mission.id, chosen, req.objective))
        return mission

    @extras_router.delete("/missions/{mission_id}")
    async def delete_mission(mission_id: str):
        await db.missions.delete_one({"id": mission_id})
        return {"deleted": True}

    # ===================== BATTLE MODE =====================

    @extras_router.post("/battle")
    async def battle_agents(request: Request):
        """Run the same prompt through multiple agents in parallel and return all responses."""
        import asyncio
        body = await request.json()
        prompt = body.get("prompt", "").strip()
        agent_keys = body.get("agent_keys", [])
        if not prompt:
            raise HTTPException(status_code=400, detail="Prompt required")
        if not agent_keys or len(agent_keys) < 2:
            raise HTTPException(status_code=400, detail="Pick at least 2 agents")
        if len(agent_keys) > 4:
            raise HTTPException(status_code=400, detail="Max 4 agents in a battle")

        agents = []
        for k in agent_keys:
            t = get_template(k)
            if not t:
                raise HTTPException(status_code=400, detail=f"Unknown agent: {k}")
            agents.append(t)

        async def run_one(agent_template):
            try:
                out = await run_chat_fn(
                    session_id=f"battle-{uuid.uuid4()}",
                    system_prompt=agent_template["system_prompt"],
                    history=[],
                    user_text=prompt,
                )
                return {
                    "agent_key": agent_template["key"],
                    "agent_name": agent_template["name"],
                    "role": agent_template["role"],
                    "color": agent_template.get("color", "#9B111E"),
                    "output": out,
                    "status": "complete",
                }
            except Exception as e:
                logger.exception(f"Battle agent {agent_template['key']} failed: {e}")
                return {
                    "agent_key": agent_template["key"],
                    "agent_name": agent_template["name"],
                    "role": agent_template["role"],
                    "color": agent_template.get("color", "#9B111E"),
                    "output": f"Agent unavailable: {e}",
                    "status": "failed",
                }

        results = await asyncio.gather(*(run_one(a) for a in agents))
        return {"prompt": prompt, "results": results}

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
