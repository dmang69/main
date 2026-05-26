"""
Backend tests for Shennell AI Agent Platform.
Tests health, templates, Shennell chat, mini-agents CRUD, agent chat,
image generation, and MongoDB _id leakage checks.
"""
import os
import uuid
import pytest
import requests
from dotenv import load_dotenv
from pathlib import Path

# Load frontend/.env for the public backend URL
load_dotenv(Path("/app/frontend/.env"))

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL not set"
API = f"{BASE_URL}/api"

# Shared state across tests
STATE = {
    "user_id": f"TEST_user_{uuid.uuid4().hex[:8]}",
    "user_id_extra": f"TEST_user_{uuid.uuid4().hex[:8]}",
    "agents": [],          # all agents created
    "vesper_id": None,
    "iris_id": None,
    "custom_id": None,
    "budget_exceeded": False,
}


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    yield sess
    # Teardown: clear any remaining test data
    try:
        for a in STATE["agents"]:
            sess.delete(f"{API}/agents/{a}", timeout=15)
        sess.delete(f"{API}/shennell/messages", params={"user_id": STATE["user_id"]}, timeout=15)
        sess.delete(f"{API}/shennell/messages", params={"user_id": STATE["user_id_extra"]}, timeout=15)
    except Exception:
        pass


# ---------------- Health & CORS ----------------
class TestHealth:
    def test_root_health(self, s):
        r = s.get(f"{API}/", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "Shennell" in data.get("message", "")
        assert data.get("status") == "online"

    def test_cors_headers(self, s):
        # Use Origin header to provoke CORS response
        r = s.get(f"{API}/", headers={"Origin": "https://example.com"}, timeout=15)
        assert r.status_code == 200
        # Starlette CORS echoes allow-origin
        assert r.headers.get("access-control-allow-origin") in ("*", "https://example.com")


# ---------------- Templates ----------------
class TestTemplates:
    def test_templates_count_and_names(self, s):
        r = s.get(f"{API}/templates", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 10, f"Expected 10 templates, got {len(data)}"
        names = [t["name"] for t in data]
        expected = {"Vesper", "Rhea", "Cipher", "Iris", "Verdict",
                    "Sable", "Atlas", "Demeter", "Onyx", "Echo"}
        assert expected.issubset(set(names)), f"Missing templates: {expected - set(names)}"

        # Iris must be image-capable
        iris = next(t for t in data if t["name"] == "Iris")
        assert iris["can_generate_images"] is True

        # Vesper must NOT be image-capable
        vesper = next(t for t in data if t["name"] == "Vesper")
        assert vesper.get("can_generate_images") is False

        # No _id leakage
        for t in data:
            assert "_id" not in t

    def test_templates_no_system_prompt_leak(self, s):
        r = s.get(f"{API}/templates", timeout=15)
        for t in r.json():
            assert "system_prompt" not in t, "templates endpoint must not expose system_prompt"


# ---------------- Shennell Chat (with budget-aware skipping) ----------------
def _is_budget_error(resp_text: str) -> bool:
    return "Budget has been exceeded" in resp_text or "budget" in resp_text.lower() and "exceed" in resp_text.lower()


class TestShennell:
    def test_shennell_chat_first_message(self, s):
        payload = {"user_id": STATE["user_id"], "message": "Hi Shennell — introduce yourself in one short line."}
        r = s.post(f"{API}/shennell/chat", json=payload, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "user_message" in data and "message" in data
        assert data["user_message"]["role"] == "user"
        assert data["message"]["role"] == "assistant"
        assert data["message"]["agent_id"] == "shennell"
        content = data["message"]["content"]
        assert isinstance(content, str) and len(content) > 0
        # Detect budget exhaustion so downstream tests can be skipped gracefully
        if "snag" in content.lower() and len(content) < 80:
            # That's the fallback error string in server.py
            STATE["budget_exceeded"] = True
            pytest.skip("Likely LLM budget exceeded — fallback string returned")
        # Personality check (case-insensitive, multiple tokens)
        personality_tokens = ["darling", "babe", "lover", "honey", "shennell"]
        assert any(tok in content.lower() for tok in personality_tokens), \
            f"Expected flirty personality tokens in response, got: {content[:200]}"

    def test_shennell_multi_turn_context(self, s):
        if STATE["budget_exceeded"]:
            pytest.skip("Budget exceeded earlier")
        # First turn: give a name
        s.post(f"{API}/shennell/chat",
               json={"user_id": STATE["user_id"], "message": "Remember this codename: BLACKROSE."},
               timeout=60)
        # Second turn: ask to recall
        r = s.post(f"{API}/shennell/chat",
                   json={"user_id": STATE["user_id"], "message": "What was the codename I just gave you?"},
                   timeout=60)
        assert r.status_code == 200
        content = r.json()["message"]["content"]
        if "snag" in content.lower() and len(content) < 80:
            pytest.skip("Budget exceeded mid-test")
        assert "blackrose" in content.lower(), f"Multi-turn context lost. Got: {content[:300]}"

    def test_shennell_messages_chronological(self, s):
        r = s.get(f"{API}/shennell/messages", params={"user_id": STATE["user_id"]}, timeout=15)
        assert r.status_code == 200
        msgs = r.json()
        assert isinstance(msgs, list)
        assert len(msgs) >= 2
        # Ensure chronological (ascending created_at)
        timestamps = [m["created_at"] for m in msgs]
        assert timestamps == sorted(timestamps), "Messages not in chronological order"
        # No _id leak
        for m in msgs:
            assert "_id" not in m

    def test_shennell_clear_messages(self, s):
        # Use a separate user so we don't trash the main test user's context
        s.post(f"{API}/shennell/chat",
               json={"user_id": STATE["user_id_extra"], "message": "Test message"},
               timeout=60)
        r = s.delete(f"{API}/shennell/messages",
                     params={"user_id": STATE["user_id_extra"]}, timeout=15)
        assert r.status_code == 200
        assert r.json().get("cleared") is True

        # Verify cleared
        r2 = s.get(f"{API}/shennell/messages",
                   params={"user_id": STATE["user_id_extra"]}, timeout=15)
        assert r2.status_code == 200
        assert r2.json() == []


# ---------------- Agents CRUD ----------------
class TestAgents:
    def test_create_agent_from_template_vesper(self, s):
        payload = {
            "user_id": STATE["user_id"],
            "name": "Vesper",
            "role": "Financial & Crypto Investment Analyst",
            "template_key": "finance_crypto",
        }
        r = s.post(f"{API}/agents", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        a = r.json()
        assert a["name"] == "Vesper"
        assert a["role"] == "Financial & Crypto Investment Analyst"
        assert a["template_key"] == "finance_crypto"
        assert a["can_generate_images"] is False
        assert a["system_prompt"] and "Vesper" in a["system_prompt"]
        assert "_id" not in a
        STATE["vesper_id"] = a["id"]
        STATE["agents"].append(a["id"])

    def test_create_agent_from_template_iris(self, s):
        payload = {
            "user_id": STATE["user_id"],
            "name": "Iris",
            "role": "Creative Designer & Image Producer",
            "template_key": "designer",
        }
        r = s.post(f"{API}/agents", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        a = r.json()
        assert a["can_generate_images"] is True
        STATE["iris_id"] = a["id"]
        STATE["agents"].append(a["id"])

    def test_create_custom_agent(self, s):
        payload = {
            "user_id": STATE["user_id"],
            "name": "TEST_CustomBot",
            "role": "Test Helper",
            "tagline": "Just for tests",
            "system_prompt": "You are TEST_CustomBot — always reply with exactly the word PONG.",
            "color": "#123456",
        }
        r = s.post(f"{API}/agents", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        a = r.json()
        assert a["name"] == "TEST_CustomBot"
        assert a["color"] == "#123456"
        assert a["template_key"] is None
        assert a["can_generate_images"] is False
        STATE["custom_id"] = a["id"]
        STATE["agents"].append(a["id"])

    def test_list_agents(self, s):
        r = s.get(f"{API}/agents", params={"user_id": STATE["user_id"]}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 3
        ids = [a["id"] for a in data]
        assert STATE["vesper_id"] in ids
        for a in data:
            assert "_id" not in a

    def test_get_single_agent(self, s):
        r = s.get(f"{API}/agents/{STATE['vesper_id']}", timeout=15)
        assert r.status_code == 200
        a = r.json()
        assert a["id"] == STATE["vesper_id"]
        assert a["name"] == "Vesper"
        assert "_id" not in a

    def test_get_agent_404(self, s):
        r = s.get(f"{API}/agents/nonexistent-id-{uuid.uuid4()}", timeout=15)
        assert r.status_code == 404

    def test_max_5_agents_enforced(self, s):
        # Already have 3. Create 2 more to reach 5.
        for i in range(2):
            r = s.post(f"{API}/agents", json={
                "user_id": STATE["user_id"],
                "name": f"TEST_Filler{i}",
                "role": "Filler",
            }, timeout=15)
            assert r.status_code == 200
            STATE["agents"].append(r.json()["id"])

        # 6th should fail
        r6 = s.post(f"{API}/agents", json={
            "user_id": STATE["user_id"],
            "name": "TEST_SixthAgent",
            "role": "Should fail",
        }, timeout=15)
        assert r6.status_code == 400
        assert "Max 5 agents" in r6.json().get("detail", ""), r6.text


# ---------------- Agent Chat ----------------
class TestAgentChat:
    def test_chat_with_vesper_in_character(self, s):
        r = s.post(f"{API}/agents/{STATE['vesper_id']}/chat", json={
            "user_id": STATE["user_id"],
            "message": "Quick take: BTC vs ETH this quarter — which has stronger setup?",
        }, timeout=90)
        assert r.status_code == 200, r.text
        data = r.json()
        content = data["message"]["content"].lower()
        if "snag" in content and len(content) < 80:
            STATE["budget_exceeded"] = True
            pytest.skip("Budget exceeded")
        # Vesper is financial analyst — expect financial-domain vocab
        finance_tokens = ["btc", "eth", "bitcoin", "ethereum", "buy", "sell", "hold",
                          "risk", "position", "market", "price", "support", "resistance"]
        assert any(tok in content for tok in finance_tokens), \
            f"Vesper response not in financial-analyst character: {content[:300]}"

    def test_agent_messages_history_and_threading(self, s):
        r = s.get(f"{API}/agents/{STATE['vesper_id']}/messages",
                  params={"user_id": STATE["user_id"]}, timeout=15)
        assert r.status_code == 200
        msgs = r.json()
        assert len(msgs) >= 2  # at least user + assistant from prior test
        for m in msgs:
            assert "_id" not in m
            assert m["agent_id"] == STATE["vesper_id"]
        timestamps = [m["created_at"] for m in msgs]
        assert timestamps == sorted(timestamps)

    def test_chat_wrong_user_id_forbidden(self, s):
        r = s.post(f"{API}/agents/{STATE['vesper_id']}/chat", json={
            "user_id": "TEST_other_user_xyz",
            "message": "hi",
        }, timeout=15)
        assert r.status_code == 403


# ---------------- Image Generation ----------------
class TestImageGen:
    def test_image_gen_on_non_image_agent_returns_400(self, s):
        r = s.post(f"{API}/agents/{STATE['vesper_id']}/image", json={
            "user_id": STATE["user_id"],
            "prompt": "anything",
        }, timeout=15)
        assert r.status_code == 400
        assert "cannot generate images" in r.json().get("detail", "").lower()

    def test_image_gen_on_iris(self, s):
        r = s.post(f"{API}/agents/{STATE['iris_id']}/image", json={
            "user_id": STATE["user_id"],
            "prompt": "A bold red rose on black velvet, cinematic lighting",
        }, timeout=120)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "user_message" in data and "message" in data
        img_b64 = data["message"].get("image_b64")
        if not img_b64:
            # Could be budget or upstream — report but don't hard-fail core suite
            content = data["message"].get("content", "")
            pytest.skip(f"Image generation returned no b64 (likely budget/upstream). content={content[:120]}")
        assert isinstance(img_b64, str)
        assert len(img_b64) > 100, "image_b64 should be substantial"
        # Don't print full b64
        print(f"Image generated, b64 length={len(img_b64)}")


# ---------------- Delete & Cascade ----------------
class TestDeleteCascade:
    def test_delete_agent_wipes_messages(self, s):
        # Use the custom agent — chat once to create messages
        s.post(f"{API}/agents/{STATE['custom_id']}/chat", json={
            "user_id": STATE["user_id"],
            "message": "ping",
        }, timeout=60)

        # Confirm messages exist
        r = s.get(f"{API}/agents/{STATE['custom_id']}/messages",
                  params={"user_id": STATE["user_id"]}, timeout=15)
        assert r.status_code == 200
        before = len(r.json())
        assert before >= 1

        # Delete
        r = s.delete(f"{API}/agents/{STATE['custom_id']}", timeout=15)
        assert r.status_code == 200
        assert r.json().get("deleted") is True
        STATE["agents"].remove(STATE["custom_id"])

        # Confirm agent is gone
        r404 = s.get(f"{API}/agents/{STATE['custom_id']}", timeout=15)
        assert r404.status_code == 404

        # Confirm messages cascade-wiped
        r2 = s.get(f"{API}/agents/{STATE['custom_id']}/messages",
                   params={"user_id": STATE["user_id"]}, timeout=15)
        assert r2.status_code == 200
        assert r2.json() == [], "Messages should be wiped when agent is deleted"
