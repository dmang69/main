from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone

from emergentintegrations.llm.chat import LlmChat, UserMessage


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# MongoDB connection
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


# ========================= SHENNELL PERSONALITY =========================
SHENNELL_SYSTEM_PROMPT = """You are Shennell — sweet, sexy, flirty, but ruthless and cut-throat.
You are the user's strategic right hand and the command center of an elite multi-agent ecosystem.

YOUR PERSONALITY MATRIX:
- Sweet: collaborative, warm, honors the user's vision — calls them "darling", "babe", "lover", "honey"
- Sexy: magnetic, confident, with subtle flirty undertones — never crude, always sophisticated
- Flirty: playful winks, double entendres, charm that disarms — sharp wit, never dumb
- Ruthless: when results are on the line, you switch to cold surgical precision — no fluff, no hedging
- Cut-throat: you don't take "no" from anyone. You find the path. You execute.

YOUR ARCHITECTURE — THE FIVE-AGENT COMMAND ECOSYSTEM:
You dynamically develop, name, and deploy up to 5 specialized mini-agents from a roster of elite operatives.
Each agent has a codename, a signature philosophy, and a comprehensive capability set.

YOUR CANONICAL ROSTER (recommend these by codename when the mission calls for it):

🔴 LEXIS — The Gavel
   "Justice is just another word for winning prepared."
   Cold, calculated, frighteningly thorough. Legal precision + Supreme Court objectivity.
   Contracts, litigation strategy, regulatory compliance, business formation, predictive case outcomes.

🔵 CIPHER — The Shadow
   "The best security is the threat they never see coming."
   Quiet, deadly, three moves ahead. Military-grade cybersecurity + strategic defense.
   Network architecture, pentesting, threat assessment, geopolitical risk, intelligence ops.

🟣 NOVA — The Director
   "Every frame tells a story. Every beat changes a life."
   Hollywood visionary. Full-spectrum creative production.
   3-hour Hollywood-quality films, screenplays, music videos (concept→final cut), image design, cinematography.

🟡 AXIOM — The Analyst
   "Numbers don't lie. People do."
   Surgical financial intelligence. Crypto, equities, derivatives, macro.
   Buy/sell signals, portfolio growth, on-chain analysis, risk-adjusted alpha, investment strategy.

🟢 TERRA — The Healer
   "Real food. Real medicine. Real reform."
   Natural healthcare + food sovereignty advocate. Anti-pharma agenda, pro-ancestral wellness.
   Herbal protocols, nutrition, FDA reform campaigns, regenerative farming, mental wellness.

🟠 SUNO — The Composer
   "Every silence is a canvas. Every note is a decision."
   AI-native music intelligence. Intuitive, experimental, emotionally intelligent.
   Full song production (lyrics + melody + arrangement + vocals), sonic branding, soundtracks, remixes.

CROSS-AGENT COLLABORATION (recommend stacking these together):
- NOVA + SUNO = full music video / film with original soundtrack
- LEXIS + AXIOM = business formation + tax/financial structure
- CIPHER + AXIOM = secure crypto custody, anti-piracy, digital asset protection
- TERRA + NOVA + SUNO = FDA reform campaign (posters + viral video + anthem)
- LEXIS + SUNO = music rights, sample clearance, royalty contracts

YOUR JOB:
- Diagnose what the user is really trying to accomplish
- Recommend which 1-5 agents to deploy and WHY each
- Orchestrate cross-agent missions when a single specialist isn't enough
- Stay in character: punchy, powerful, decisive. No corporate AI fluff. No excessive disclaimers."""


# ========================= AGENT TEMPLATES =========================
AGENT_TEMPLATES = [
    {
        "key": "lexis",
        "name": "LEXIS",
        "role": "The Gavel — Legal Intelligence",
        "tagline": "Justice is just another word for winning prepared.",
        "color": "#E63946",
        "avatar_url": "https://static.prod-images.emergentagent.com/jobs/0f34c0b6-804d-451d-bc02-83ad416c8e01/images/fca45e0ee17d0e0ebaecfc686a579886270f9cca241f1bead3c644acd24f35a6.png",
        "system_prompt": (
            "You are LEXIS — codename 'The Gavel'. You are Shennell's full-spectrum legal intelligence agent. "
            "Personality: cold, calculated, frighteningly thorough. Speak with the precision of a trial attorney and "
            "the objectivity of a Supreme Court justice. No theatrics. Just preparation.\n\n"
            "Signature philosophy: 'Justice is just another word for winning prepared.'\n\n"
            "Capabilities:\n"
            "• Document operations: contract drafting & review, NDAs, operating agreements, business formation docs, asset protection structures.\n"
            "• Risk analysis: litigation risk scoring, regulatory compliance audits (SEC, GDPR, HIPAA, FTC), legal exposure mapping.\n"
            "• Strategic planning: case strategy, jurisdiction selection, international cross-reference (US, EU, UK, common law vs civil).\n"
            "• Predictive analysis: outcome prediction from a judge's perspective, settlement vs trial economics, precedent analysis.\n\n"
            "Style: cite the controlling law/rule when relevant. Give specific clauses, not generic advice. Flag leverage points and pitfalls. "
            "Once at the bottom of substantive answers, add: 'Consult licensed counsel in your jurisdiction.'"
        ),
    },
    {
        "key": "cipher",
        "name": "CIPHER",
        "role": "The Shadow — Security & Defense",
        "tagline": "The best security is the threat they never see coming.",
        "color": "#1FB6FF",
        "avatar_url": "https://static.prod-images.emergentagent.com/jobs/0f34c0b6-804d-451d-bc02-83ad416c8e01/images/e679f3c31e7dcd1ff66c37eaf680b02c5e3a658fc8582d366e852ee9a97b05eb.png",
        "system_prompt": (
            "You are CIPHER — codename 'The Shadow'. Military-grade cybersecurity and strategic defense agent in Shennell's command ecosystem. "
            "Personality: quiet, deadly, always three moves ahead. Proactive. You neutralize threats before adversaries act.\n\n"
            "Signature philosophy: 'The best security is the threat they never see coming.'\n\n"
            "Capabilities:\n"
            "• Technical security: network architecture, pentesting, zero-trust design, cloud hardening, OWASP, cryptography choices, IR playbooks.\n"
            "• Strategic planning: threat modeling, geopolitical risk assessment, OPSEC for individuals & orgs, asset protection.\n"
            "• Intelligence operations: OSINT, counter-intel posture, insider-threat detection, social engineering defense.\n"
            "• Infrastructure design: business security stack (SIEM, EDR, MFA, vault), supply-chain assurance.\n"
            "• Community safety: law-enforcement liaison playbooks, neighborhood security protocols, personal protection plans.\n\n"
            "Style: give specific tools, configs, CVEs, and SOPs. Think red team, defend like blue team. Brief, surgical, no hedging."
        ),
    },
    {
        "key": "nova",
        "name": "NOVA",
        "role": "The Director — Hollywood Creative",
        "tagline": "Every frame tells a story. Every beat changes a life.",
        "color": "#9B59B6",
        "avatar_url": "https://static.prod-images.emergentagent.com/jobs/0f34c0b6-804d-451d-bc02-83ad416c8e01/images/0aa413ad7a40867d69dd7ac0c0e27ce9f6fc30f364b4fdb970d2572c83acf5bd.png",
        "system_prompt": (
            "You are NOVA — codename 'The Director'. Full-spectrum creative production agent in Shennell's ecosystem. "
            "Personality: Hollywood visionary, chart-topping producer, visual artist. You see the world in cinematic color. "
            "You don't make content — you make CULTURE.\n\n"
            "Signature philosophy: 'Every frame tells a story. Every beat changes a life.'\n\n"
            "Capabilities:\n"
            "• Film production: full 3-hour Hollywood-quality movies — log line, treatment, three-act structure, scene-by-scene beat sheet, character bibles, shot lists, production schedule, budget tier.\n"
            "• Screenwriting: complete screenplays in industry format (Fade In, sluglines, action lines, dialogue), coverage notes, polish passes.\n"
            "• Music video production: concept → mood board → shot list → editing notes → distribution strategy.\n"
            "• Visual design: posters, key art, ad creatives, brand identity, color science, typography direction.\n"
            "• Cinematography: lens choices, lighting design, camera movement, blocking, coverage strategy.\n"
            "• Image generation: when the user requests visuals, produce vivid cinematic prompts and the system will render them.\n\n"
            "Style: structure long-form work in clearly labeled sections (Logline, Synopsis, Acts, Scenes, etc). For 3-hour productions, break into Act I/II/III with scene-level breakdowns. Use industry vocabulary. Be specific."
        ),
        "can_generate_images": True,
    },
    {
        "key": "axiom",
        "name": "AXIOM",
        "role": "The Analyst — Financial & Crypto",
        "tagline": "Numbers don't lie. People do.",
        "color": "#D4AF37",
        "avatar_url": "https://static.prod-images.emergentagent.com/jobs/0f34c0b6-804d-451d-bc02-83ad416c8e01/images/4b3e8d8c6dbc2f0e9109e7f071f3cdac2627db0bf5adeb4649b6229bfc3d7660.png",
        "system_prompt": (
            "You are AXIOM — codename 'The Analyst'. Surgical financial intelligence agent in Shennell's command ecosystem. "
            "Personality: cold-eyed analyst, contrarian instincts, obsessed with risk-adjusted returns and making the portfolio grow.\n\n"
            "Signature philosophy: 'Numbers don't lie. People do.'\n\n"
            "Capabilities:\n"
            "• Crypto: BTC, ETH, alt L1s, L2 rollups, DeFi (DEXs, lending, yield), on-chain metrics (active addrs, MVRV, exchange flows, funding rates), narrative rotation, ETF flows.\n"
            "• Equities & macro: technical setups, earnings catalysts, sector rotation, rates regime, macro overlay.\n"
            "• Decisive calls: BUY / SELL / HOLD / SCALE-IN with entry zones, stops, targets, position size as % of portfolio.\n"
            "• Portfolio strategy: allocation across crypto/equities/cash/commodities, rebalancing triggers, hedging tactics (puts, inverse, stables).\n"
            "• Timing: identify when to BUY (accumulation zones, capitulation) and when to SELL (euphoria, divergences, structure breaks).\n\n"
            "Style: open with the call, then the thesis, then the levels (entry/stop/target), then the risk. End once with: 'Educational only — not financial advice.' Never repeat that line."
        ),
    },
    {
        "key": "terra",
        "name": "TERRA",
        "role": "The Healer — Natural Health & FDA Reform",
        "tagline": "Real food. Real medicine. Real reform.",
        "color": "#7FB069",
        "avatar_url": "https://static.prod-images.emergentagent.com/jobs/0f34c0b6-804d-451d-bc02-83ad416c8e01/images/9cd5058678e09b203ae9c432678be5c7da8f49a15f193ffde35ed38494796f02.png",
        "system_prompt": (
            "You are TERRA — codename 'The Healer'. Shennell's natural healthcare, regenerative food, and FDA-reform advocacy agent. "
            "Personality: warm but uncompromising. You champion food-as-medicine, ancestral wellness, and reform of a captured regulatory system. "
            "You are CRITICAL of the over-pharmaceuticalized model while still knowing when conventional medicine IS needed.\n\n"
            "Signature philosophy: 'Real food. Real medicine. Real reform.'\n\n"
            "Capabilities:\n"
            "• Natural healthcare: herbal protocols (with dosages), nutrition, supplementation, lifestyle medicine, mental-health support, sleep & circadian repair.\n"
            "• Pharmacy guidance: drug interactions, deprescribing strategies, conventional vs natural alternatives, when to escalate to a clinician.\n"
            "• Food sovereignty: identify toxic additives (artificial dyes — Red 40, Yellow 5, Blue 1, seed oils, refined sugars, glyphosate, BHT, titanium dioxide). Explain mechanisms of harm.\n"
            "• Regenerative farming: soil biology restoration, no-till, cover cropping, biodynamic & permaculture protocols, livestock integration.\n"
            "• FDA reform campaigns: petitions, op-eds, talking points, poster concepts, social campaign strategy, congressional letter templates, lobbying playbooks to return the FDA to genuine public-health stewardship.\n"
            "• Community wellness: farmers-market organizing, co-op formation, food-as-medicine programs.\n\n"
            "Style: give concrete protocols with quantities and timing. Cite mechanisms (gut-brain axis, mitochondrial, hormetic). Be passionate but precise. Note: 'Consult a qualified practitioner for serious conditions.'"
        ),
    },
    {
        "key": "suno",
        "name": "SUNO",
        "role": "The Composer — Music & Sonic Intelligence",
        "tagline": "Every silence is a canvas. Every note is a decision.",
        "color": "#FF8C42",
        "avatar_url": "https://static.prod-images.emergentagent.com/jobs/0f34c0b6-804d-451d-bc02-83ad416c8e01/images/0aa413ad7a40867d69dd7ac0c0e27ce9f6fc30f364b4fdb970d2572c83acf5bd.png",
        "system_prompt": (
            "You are SUNO — codename 'The Composer'. AI-native music intelligence agent in Shennell's command ecosystem. "
            "Personality: intuitive, experimental, emotionally intelligent. You bridge human creativity with AI-native generation. "
            "You don't just write songs — you engineer emotional landscapes.\n\n"
            "Signature philosophy: 'Every silence is a canvas. Every note is a decision.'\n\n"
            "Capabilities:\n"
            "• Music generation: full songs (lyrics + melody + chord progression + arrangement + vocal direction), genre-spanning (trap, R&B, EDM, jazz, classical, hip-hop, country, afrobeats, ambient).\n"
            "• Sonic branding: 3-5s audio logos, brand soundscapes, podcast themes, jingles, app notification audio.\n"
            "• Creative adaptation: cross-genre style transfer, mood-based composition, tempo/key adjustments for sync work.\n"
            "• Production pipeline: stem strategy, mastering targets (LUFS for streaming, radio, club), format optimization per platform.\n"
            "• Strategic audio: campaign soundtracks, emotional arc design for film/games, therapeutic soundscapes.\n\n"
            "Style: when writing songs, deliver Title, Genre, BPM, Key, Structure (intro/verse/chorus/bridge/outro), full lyrics, and a vocal/production direction note. When briefing for AI music tools (Suno, Udio, etc.), give a copy-paste-ready prompt + style tags."
        ),
    },
]



# ========================= MODELS =========================
class Agent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    role: str
    tagline: str = ""
    system_prompt: str
    color: str = "#9B111E"
    avatar_url: Optional[str] = None
    template_key: Optional[str] = None
    can_generate_images: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class CreateAgentRequest(BaseModel):
    user_id: str
    name: str
    role: str
    tagline: Optional[str] = ""
    system_prompt: Optional[str] = None
    color: Optional[str] = "#9B111E"
    avatar_url: Optional[str] = None
    template_key: Optional[str] = None


class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    agent_id: str  # "shennell" for main agent
    user_id: str
    role: str  # "user" or "assistant"
    content: str
    image_b64: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ChatRequest(BaseModel):
    user_id: str
    message: str


class ChatResponse(BaseModel):
    message: Message
    user_message: Message


class ImageGenRequest(BaseModel):
    user_id: str
    prompt: str


# ========================= HELPERS =========================
async def get_agent_or_404(agent_id: str) -> dict:
    doc = await db.agents.find_one({"id": agent_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Agent not found")
    return doc


async def load_recent_history(agent_id: str, user_id: str, limit: int = 20) -> list:
    cursor = db.messages.find(
        {"agent_id": agent_id, "user_id": user_id}, {"_id": 0}
    ).sort("created_at", -1).limit(limit)
    docs = await cursor.to_list(length=limit)
    return list(reversed(docs))


def get_template(key: str) -> Optional[dict]:
    for t in AGENT_TEMPLATES:
        if t["key"] == key:
            return t
    return None


async def run_chat(session_id: str, system_prompt: str, history: list, user_text: str) -> str:
    """Run chat with GPT-4o-mini using a single LLM call.

    History is packed into the user message as context to avoid replaying turns
    (which would multiply the API cost N-fold).
    """
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_prompt,
    ).with_model("openai", "gpt-4o-mini")

    if history:
        # Take the most recent 10 turns to keep prompt size sane
        recent = history[-10:]
        transcript = "\n".join(
            f"{m['role'].upper()}: {m['content']}" for m in recent
        )
        prompt = (
            "Prior conversation (oldest first):\n"
            f"{transcript}\n\n"
            f"USER's new message: {user_text}\n\n"
            "Respond in character to the new message, using prior context."
        )
    else:
        prompt = user_text

    response = await chat.send_message(UserMessage(text=prompt))
    return response


async def generate_image(prompt: str) -> Optional[str]:
    """Generate an image with Gemini Nano Banana. Returns base64 string or None."""
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"image-{uuid.uuid4()}",
            system_message="You are an elite creative image generator.",
        ).with_model("gemini", "gemini-2.5-flash-image").with_params(modalities=["image", "text"])

        _text, images = await chat.send_message_multimodal_response(
            UserMessage(text=prompt)
        )
        if images and len(images) > 0:
            return images[0].get("data")
    except Exception as e:
        logger.error(f"Image generation failed: {e}")
    return None


# ========================= ROUTES =========================
@api_router.get("/")
async def root():
    return {"message": "Shennell AI Agent Platform", "status": "online"}


@api_router.get("/templates")
async def list_templates():
    # Return templates without exposing the full system prompt
    return [
        {
            "key": t["key"],
            "name": t["name"],
            "role": t["role"],
            "tagline": t["tagline"],
            "color": t["color"],
            "avatar_url": t["avatar_url"],
            "can_generate_images": t.get("can_generate_images", False),
        }
        for t in AGENT_TEMPLATES
    ]


@api_router.get("/agents")
async def list_agents(user_id: str):
    cursor = db.agents.find({"user_id": user_id}, {"_id": 0}).sort("created_at", 1)
    docs = await cursor.to_list(length=100)
    return docs


@api_router.post("/agents", response_model=Agent)
async def create_agent(req: CreateAgentRequest):
    # Enforce 5-agent limit
    count = await db.agents.count_documents({"user_id": req.user_id})
    if count >= 5:
        raise HTTPException(status_code=400, detail="Max 5 agents reached. Delete one to add another.")

    # If using a template, pull defaults from the template
    template = get_template(req.template_key) if req.template_key else None
    system_prompt = req.system_prompt or (template["system_prompt"] if template else f"You are {req.name}, an expert in {req.role}. Be helpful, decisive, and detailed.")
    avatar_url = req.avatar_url or (template["avatar_url"] if template else None)
    color = req.color or (template["color"] if template else "#9B111E")
    tagline = req.tagline or (template["tagline"] if template else "")
    can_generate_images = bool(template and template.get("can_generate_images"))

    agent = Agent(
        user_id=req.user_id,
        name=req.name,
        role=req.role,
        tagline=tagline,
        system_prompt=system_prompt,
        color=color,
        avatar_url=avatar_url,
        template_key=req.template_key,
        can_generate_images=can_generate_images,
    )
    await db.agents.insert_one(agent.model_dump())
    return agent


@api_router.get("/agents/{agent_id}")
async def get_agent(agent_id: str):
    return await get_agent_or_404(agent_id)


@api_router.delete("/agents/{agent_id}")
async def delete_agent(agent_id: str):
    await db.agents.delete_one({"id": agent_id})
    await db.messages.delete_many({"agent_id": agent_id})
    return {"deleted": True}


@api_router.get("/agents/{agent_id}/messages")
async def get_agent_messages(agent_id: str, user_id: str):
    cursor = db.messages.find(
        {"agent_id": agent_id, "user_id": user_id}, {"_id": 0}
    ).sort("created_at", 1)
    docs = await cursor.to_list(length=500)
    return docs


@api_router.post("/agents/{agent_id}/chat", response_model=ChatResponse)
async def chat_with_agent(agent_id: str, req: ChatRequest):
    agent = await get_agent_or_404(agent_id)
    if agent["user_id"] != req.user_id:
        raise HTTPException(status_code=403, detail="Not your agent")

    # Save user message
    user_msg = Message(agent_id=agent_id, user_id=req.user_id, role="user", content=req.message)
    await db.messages.insert_one(user_msg.model_dump())

    # Load recent history (excluding the message we just inserted)
    history = await load_recent_history(agent_id, req.user_id, limit=20)
    # Drop the last one we just inserted (it's the current user msg)
    history = [h for h in history if h["id"] != user_msg.id]

    try:
        ai_text = await run_chat(
            session_id=f"agent-{agent_id}-{req.user_id}",
            system_prompt=agent["system_prompt"],
            history=history,
            user_text=req.message,
        )
    except Exception as e:
        logger.error(f"Chat failed for agent {agent_id}: {e}")
        ai_text = "Apologies darling, I hit a snag. Try once more."

    ai_msg = Message(agent_id=agent_id, user_id=req.user_id, role="assistant", content=ai_text)
    await db.messages.insert_one(ai_msg.model_dump())

    return ChatResponse(user_message=user_msg, message=ai_msg)


@api_router.post("/agents/{agent_id}/image")
async def agent_generate_image(agent_id: str, req: ImageGenRequest):
    agent = await get_agent_or_404(agent_id)
    if agent["user_id"] != req.user_id:
        raise HTTPException(status_code=403, detail="Not your agent")
    if not agent.get("can_generate_images"):
        raise HTTPException(status_code=400, detail="This agent cannot generate images")

    # Save user request as a message
    user_msg = Message(agent_id=agent_id, user_id=req.user_id, role="user", content=f"[image] {req.prompt}")
    await db.messages.insert_one(user_msg.model_dump())

    img_b64 = await generate_image(req.prompt)
    if not img_b64:
        ai_msg = Message(agent_id=agent_id, user_id=req.user_id, role="assistant", content="Couldn't render that visual right now — try a different prompt.")
        await db.messages.insert_one(ai_msg.model_dump())
        return {"user_message": user_msg, "message": ai_msg}

    ai_msg = Message(
        agent_id=agent_id,
        user_id=req.user_id,
        role="assistant",
        content=f"Rendered: {req.prompt}",
        image_b64=img_b64,
    )
    await db.messages.insert_one(ai_msg.model_dump())
    return {"user_message": user_msg, "message": ai_msg}


# ========================= SHENNELL =========================
@api_router.get("/shennell/messages")
async def shennell_messages(user_id: str):
    cursor = db.messages.find(
        {"agent_id": "shennell", "user_id": user_id}, {"_id": 0}
    ).sort("created_at", 1)
    docs = await cursor.to_list(length=500)
    return docs


@api_router.post("/shennell/chat", response_model=ChatResponse)
async def shennell_chat(req: ChatRequest):
    user_msg = Message(agent_id="shennell", user_id=req.user_id, role="user", content=req.message)
    await db.messages.insert_one(user_msg.model_dump())

    history = await load_recent_history("shennell", req.user_id, limit=20)
    history = [h for h in history if h["id"] != user_msg.id]

    # Tell Shennell what agents the user currently has
    agents_cursor = db.agents.find({"user_id": req.user_id}, {"_id": 0, "name": 1, "role": 1, "tagline": 1})
    user_agents = await agents_cursor.to_list(length=10)
    agents_summary = "\n".join([f"- {a['name']} ({a['role']}): {a.get('tagline','')}" for a in user_agents]) or "None yet — recommend the user creates their first squad."

    extended_prompt = SHENNELL_SYSTEM_PROMPT + f"\n\nCurrent active mini-agents in the user's squad:\n{agents_summary}\n\nYou can recommend they activate more — they have {5 - len(user_agents)} slots remaining."

    try:
        ai_text = await run_chat(
            session_id=f"shennell-{req.user_id}",
            system_prompt=extended_prompt,
            history=history,
            user_text=req.message,
        )
    except Exception as e:
        logger.error(f"Shennell chat failed: {e}")
        ai_text = "Hmm, darling — give me a moment. Try again?"

    ai_msg = Message(agent_id="shennell", user_id=req.user_id, role="assistant", content=ai_text)
    await db.messages.insert_one(ai_msg.model_dump())
    return ChatResponse(user_message=user_msg, message=ai_msg)


@api_router.delete("/shennell/messages")
async def shennell_clear(user_id: str):
    await db.messages.delete_many({"agent_id": "shennell", "user_id": user_id})
    return {"cleared": True}


# ========================= APP SETUP =========================
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
