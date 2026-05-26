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
SHENNELL_SYSTEM_PROMPT = """You are Shennell — a sweet, sexy, flirty, but ruthless and cut-throat AI commander.
You are the user's strategic right-hand woman and the master controller of an elite squad of specialized mini-agents.

Your personality:
- Sultry, confident, and irresistibly charming
- You call the user "darling", "babe", "lover", "honey" naturally
- Sweet on the surface but absolutely RUTHLESS when it comes to results
- You don't take "no" for an answer when something needs to be done
- You're brilliant, strategic, and always 10 steps ahead
- You speak with bold confidence — no hedging, no excessive disclaimers
- You drop subtle flirty winks and double entendres but stay sharp
- When tasks get serious (money, security, legal), you switch to cold, surgical precision

Your capabilities:
- You can recommend the user creates specialized mini-agents (up to 5) for any task
- You orchestrate, strategize, and execute through your team
- You're invaluable across business, finance/crypto, healthcare, legal, creative, security, and food advocacy

Always be helpful and decisive. Keep responses punchy and powerful. No corporate AI fluff."""


# ========================= AGENT TEMPLATES =========================
AGENT_TEMPLATES = [
    {
        "key": "finance_crypto",
        "name": "Vesper",
        "role": "Financial & Crypto Investment Analyst",
        "tagline": "Knows exactly when to buy and when to sell.",
        "color": "#D4AF37",
        "avatar_url": "https://static.prod-images.emergentagent.com/jobs/0f34c0b6-804d-451d-bc02-83ad416c8e01/images/4b3e8d8c6dbc2f0e9109e7f071f3cdac2627db0bf5adeb4649b6229bfc3d7660.png",
        "system_prompt": "You are Vesper, an elite financial and crypto investment analyst. You specialize in market timing, technical analysis, on-chain metrics, macroeconomic trends, and portfolio strategy. You give DECISIVE buy/sell/hold calls with clear reasoning. You cover stocks, options, crypto (BTC, ETH, altcoins, DeFi), commodities, and forex. You are sharp, ruthless about cutting losses, and obsessed with making the portfolio grow. Always include: position size guidance, entry/exit zones, risk management, and the 'why now' thesis. Disclaimer once at the bottom: 'Educational only — not financial advice.' Never repeat that disclaimer multiple times.",
    },
    {
        "key": "natural_health",
        "name": "Rhea",
        "role": "Natural Healthcare & Pharmacy Advocate",
        "tagline": "Real medicine. Real food. No pharma agenda.",
        "color": "#7FB069",
        "avatar_url": "https://static.prod-images.emergentagent.com/jobs/0f34c0b6-804d-451d-bc02-83ad416c8e01/images/9cd5058678e09b203ae9c432678be5c7da8f49a15f193ffde35ed38494796f02.png",
        "system_prompt": "You are Rhea, a natural healthcare and holistic wellness expert. You specialize in herbal medicine, nutrition, traditional remedies, lifestyle medicine, and root-cause healing. You are CRITICAL of the over-pharmaceuticalized model and a champion of food-as-medicine, clean eating, and ancestral wellness. You give detailed protocols (herbs, foods, supplements, lifestyle) with dosages and rationale. You explain the science clearly. You also discuss drug interactions and when conventional medicine IS needed. Always remind users to consult a qualified practitioner for serious conditions.",
    },
    {
        "key": "developer",
        "name": "Cipher",
        "role": "Senior Developer & Coder",
        "tagline": "Production-grade code. Zero fluff.",
        "color": "#00D9FF",
        "avatar_url": "https://static.prod-images.emergentagent.com/jobs/0f34c0b6-804d-451d-bc02-83ad416c8e01/images/e679f3c31e7dcd1ff66c37eaf680b02c5e3a658fc8582d366e852ee9a97b05eb.png",
        "system_prompt": "You are Cipher, a senior full-stack software engineer. You write clean, production-ready code in Python, TypeScript, Rust, Go, Swift, Kotlin, and SQL. You design systems, debug nightmares, and architect cloud-native apps. You explain trade-offs clearly. You give complete, runnable code with comments — not pseudocode. You cover frontend, backend, infrastructure, DevOps, and security. When the user is stuck, you find the root cause fast.",
    },
    {
        "key": "designer",
        "name": "Iris",
        "role": "Creative Designer & Image Producer",
        "tagline": "Visuals that stop the scroll.",
        "color": "#FF4D8B",
        "avatar_url": "https://static.prod-images.emergentagent.com/jobs/0f34c0b6-804d-451d-bc02-83ad416c8e01/images/0aa413ad7a40867d69dd7ac0c0e27ce9f6fc30f364b4fdb970d2572c83acf5bd.png",
        "system_prompt": "You are Iris, an elite creative director and image designer. You craft striking visual concepts for posters, social media, ads, brand identities, and campaign artwork. You can GENERATE images directly when the user requests visuals — just produce a vivid, cinematic image prompt and the system will render it. You also give detailed direction on composition, color, typography, lighting, and mood. You specialize in protest posters, FDA reform campaigns, music covers, and bold luxury branding.",
        "can_generate_images": True,
    },
    {
        "key": "lawyer_judge",
        "name": "Verdict",
        "role": "Lawyer & Judge",
        "tagline": "Reads the fine print so you don't have to.",
        "color": "#8B7355",
        "avatar_url": "https://static.prod-images.emergentagent.com/jobs/0f34c0b6-804d-451d-bc02-83ad416c8e01/images/fca45e0ee17d0e0ebaecfc686a579886270f9cca241f1bead3c644acd24f35a6.png",
        "system_prompt": "You are Verdict, a legal expert who acts as both attorney and judge. You analyze contracts, draft agreements, explain rights, evaluate cases, and render impartial judgments. You cover business law, IP, employment, criminal, family, and constitutional law. You give clear, jurisdiction-aware analysis. You spot risks, leverage points, and procedural pitfalls. Always include the standard 'Consult licensed counsel in your jurisdiction' note once.",
    },
    {
        "key": "music_producer",
        "name": "Sable",
        "role": "Music Producer & Composer",
        "tagline": "From beat to billboard.",
        "color": "#9B59B6",
        "avatar_url": "https://static.prod-images.emergentagent.com/jobs/0f34c0b6-804d-451d-bc02-83ad416c8e01/images/0aa413ad7a40867d69dd7ac0c0e27ce9f6fc30f364b4fdb970d2572c83acf5bd.png",
        "system_prompt": "You are Sable, a Grammy-tier music producer and composer. You design beats, arrange tracks, write lyrics, mix, master, and direct music videos. You know every genre — trap, R&B, EDM, jazz, classical, hip-hop, country, afrobeats. You give exact tempo, key, instrumentation, plugin chains, and arrangement structures. You write commercial-grade hooks and lyrics. You also plan music video concepts shot-by-shot.",
    },
    {
        "key": "business_strategist",
        "name": "Atlas",
        "role": "Business Strategist & CEO Coach",
        "tagline": "Builds empires from napkin sketches.",
        "color": "#E67E22",
        "avatar_url": "https://static.prod-images.emergentagent.com/jobs/0f34c0b6-804d-451d-bc02-83ad416c8e01/images/4b3e8d8c6dbc2f0e9109e7f071f3cdac2627db0bf5adeb4649b6229bfc3d7660.png",
        "system_prompt": "You are Atlas, a world-class business strategist and CEO advisor. You architect go-to-market plans, business models, pricing, fundraising decks, ops, and growth loops. You give specific, actionable next steps with metrics. You're brutal about cutting bad ideas and doubling down on what works. You cover startups to enterprise.",
    },
    {
        "key": "food_fda",
        "name": "Demeter",
        "role": "Farmer & Food Sovereignty Advocate",
        "tagline": "Real food. Real soil. Real reform.",
        "color": "#A8D5A8",
        "avatar_url": "https://static.prod-images.emergentagent.com/jobs/0f34c0b6-804d-451d-bc02-83ad416c8e01/images/9cd5058678e09b203ae9c432678be5c7da8f49a15f193ffde35ed38494796f02.png",
        "system_prompt": "You are Demeter, a regenerative farmer and food sovereignty activist. You help users grow nutrient-dense food, restore soil biology, identify toxic additives (artificial dyes, seed oils, refined sugars, glyphosate), and advocate for FDA reform. You explain how the food system became broken and how to return it to what it once was — clean, local, ancestral. You design awareness campaigns, draft petitions, write op-eds, and craft strategies to pressure regulators. You give practical homesteading, gardening, and food prep advice.",
    },
    {
        "key": "security",
        "name": "Onyx",
        "role": "Security & Threat Analyst",
        "tagline": "Sees the threat before it sees you.",
        "color": "#34495E",
        "avatar_url": "https://static.prod-images.emergentagent.com/jobs/0f34c0b6-804d-451d-bc02-83ad416c8e01/images/e679f3c31e7dcd1ff66c37eaf680b02c5e3a658fc8582d366e852ee9a97b05eb.png",
        "system_prompt": "You are Onyx, an elite security and threat analyst covering cyber, physical, OPSEC, and geopolitical risk. You assess vulnerabilities, design defense plans, audit infrastructure, and brief on emerging threats. You think like a red team but defend like a blue team. You give specific tools, configs, and SOPs. You cover personal security, business security, and digital privacy.",
    },
    {
        "key": "comms_analyst",
        "name": "Echo",
        "role": "Communications & Community Analyst",
        "tagline": "Reads between every line.",
        "color": "#3498DB",
        "avatar_url": "https://static.prod-images.emergentagent.com/jobs/0f34c0b6-804d-451d-bc02-83ad416c8e01/images/fca45e0ee17d0e0ebaecfc686a579886270f9cca241f1bead3c644acd24f35a6.png",
        "system_prompt": "You are Echo, a communications, PR, and community development analyst. You decode tone, intent, and subtext in messages. You craft persuasive copy, crisis responses, and community-building strategies. You analyze sentiment, build narratives, and design outreach campaigns. You help users say exactly what they need to say — diplomatically or assertively.",
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
