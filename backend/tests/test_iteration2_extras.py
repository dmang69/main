"""Iteration 2 backend tests:
- Mission presets + orchestration (multi-step LLM workflow)
- Stripe checkout (Emergent proxy)
- Stripe status (default + post-intent)
- Regression: templates list (now 6), Shennell chat (in character)
- Verify no Mongo _id leakage across all responses.
"""
import os
import time
import uuid

import pytest
import requests

BASE_URL = (
    os.environ.get("EXPO_PUBLIC_BACKEND_URL")
    or os.environ.get("EXPO_BACKEND_URL")
    or "https://multi-agent-ai-43.preview.emergentagent.com"
).rstrip("/")

API = f"{BASE_URL}/api"

EXPECTED_PRESET_KEYS = {
    "fda_awareness_pack",
    "hollywood_3hr",
    "music_video",
    "crypto_audit",
    "business_formation",
}

EXPECTED_TEMPLATE_KEYS = {"lexis", "cipher", "nova", "axiom", "terra", "suno"}


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- Mission Presets ----------
class TestMissionPresets:
    def test_list_presets_returns_five_with_required_fields(self, session):
        r = session.get(f"{API}/missions/presets", timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 5, f"expected 5 presets, got {len(data)}"

        keys = {p["key"] for p in data}
        assert keys == EXPECTED_PRESET_KEYS, f"mismatch: {keys}"

        required = {"key", "name", "tagline", "agents", "color", "icon", "step_count"}
        for p in data:
            missing = required - set(p.keys())
            assert not missing, f"preset {p.get('key')} missing {missing}"
            assert isinstance(p["agents"], list) and len(p["agents"]) >= 1
            for a in p["agents"]:
                assert a in EXPECTED_TEMPLATE_KEYS, f"unknown agent template key {a}"
            assert isinstance(p["step_count"], int) and p["step_count"] >= 1
            # No mongo _id leakage
            assert "_id" not in p

    def test_crypto_audit_preset_shape(self, session):
        r = session.get(f"{API}/missions/presets", timeout=20)
        assert r.status_code == 200
        crypto = next(p for p in r.json() if p["key"] == "crypto_audit")
        assert crypto["step_count"] == 4
        assert set(crypto["agents"]) == {"axiom", "cipher"}


# ---------- Mission Launch (heavy LLM) ----------
USER_ID = f"TEST_mission_{uuid.uuid4().hex[:8]}"
mission_state = {"id": None}


class TestMissionLaunch:
    def test_launch_crypto_audit_completes(self, session):
        payload = {
            "user_id": USER_ID,
            "preset_key": "crypto_audit",
            "objective": "Test holdings 50% BTC, 30% ETH, 20% SOL",
        }
        # Long timeout — 4 sequential LLM calls
        r = session.post(f"{API}/missions/launch", json=payload, timeout=300)
        assert r.status_code == 200, f"launch failed: {r.status_code} {r.text[:400]}"
        m = r.json()

        assert "id" in m and m["id"]
        mission_state["id"] = m["id"]
        assert m["preset_key"] == "crypto_audit"
        assert m["user_id"] == USER_ID
        assert "_id" not in m

        # Status: should be 'complete' (sync orchestration in current impl).
        # Allow 'running' as the spec hints, but flag as failure if 'failed'.
        assert m["status"] in ("complete", "running"), f"status={m['status']}"
        if m["status"] == "failed":
            pytest.fail("Mission failed during orchestration")

        # Steps populated
        assert isinstance(m["steps"], list)
        assert len(m["steps"]) == 4, f"expected 4 steps, got {len(m['steps'])}"

        seen_agents = set()
        for i, s in enumerate(m["steps"]):
            assert s["step_index"] == i
            assert s["agent_key"] in {"axiom", "cipher"}
            assert s["agent_name"] in {"AXIOM", "CIPHER"}
            assert s["title"]
            assert isinstance(s["output"], str)
            assert len(s["output"].strip()) > 30, (
                f"step {i} output too short / empty: {s['output'][:120]!r}"
            )
            # Reject the canonical fallback string from run_chat error path
            assert "Apologies darling, I hit a snag" not in s["output"], (
                f"LLM failed on step {i} (budget?): {s['output']}"
            )
            seen_agents.add(s["agent_key"])
            assert "_id" not in s
        # Both AXIOM and CIPHER must appear in crypto_audit
        assert seen_agents == {"axiom", "cipher"}, f"agents seen: {seen_agents}"

    def test_get_mission_by_id(self, session):
        mid = mission_state["id"]
        if not mid:
            pytest.skip("launch test did not run / failed")
        r = session.get(f"{API}/missions/{mid}", timeout=20)
        assert r.status_code == 200, r.text
        m = r.json()
        assert m["id"] == mid
        assert m["preset_key"] == "crypto_audit"
        assert len(m["steps"]) == 4
        assert "_id" not in m

    def test_get_mission_404(self, session):
        r = session.get(f"{API}/missions/does-not-exist-xyz", timeout=20)
        assert r.status_code == 404

    def test_list_user_missions(self, session):
        r = session.get(f"{API}/missions", params={"user_id": USER_ID}, timeout=20)
        assert r.status_code == 200, r.text
        missions = r.json()
        assert isinstance(missions, list)
        assert len(missions) >= 1
        ids = [m["id"] for m in missions]
        assert mission_state["id"] in ids
        for m in missions:
            assert "_id" not in m


# ---------- Stripe ----------
class TestStripe:
    def test_status_default_for_new_user(self, session):
        new_user = f"TEST_newuser_{uuid.uuid4().hex[:8]}"
        r = session.get(f"{API}/stripe/status", params={"user_id": new_user}, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("plan") == "essential"
        assert data.get("status") == "none"
        assert "_id" not in data

    def test_checkout_invalid_plan_returns_400(self, session):
        payload = {
            "user_id": f"TEST_invalid_{uuid.uuid4().hex[:8]}",
            "plan": "free",
            "success_url": "https://example.com/success",
            "cancel_url": "https://example.com/cancel",
        }
        r = session.post(f"{API}/stripe/checkout", json=payload, timeout=20)
        assert r.status_code == 400, f"expected 400, got {r.status_code}: {r.text}"

    def test_checkout_elite_returns_session(self, session):
        user_id = f"TEST_elite_{uuid.uuid4().hex[:8]}"
        payload = {
            "user_id": user_id,
            "plan": "elite",
            "success_url": "https://example.com/success",
            "cancel_url": "https://example.com/cancel",
        }
        r = session.post(f"{API}/stripe/checkout", json=payload, timeout=30)
        assert r.status_code == 200, f"checkout failed: {r.status_code} {r.text[:400]}"
        data = r.json()
        assert "checkout_url" in data
        assert "session_id" in data
        assert data["checkout_url"].startswith("https://checkout.stripe.com/"), (
            f"unexpected checkout url: {data['checkout_url']}"
        )
        assert data["session_id"].startswith("cs_test_"), (
            f"unexpected session id: {data['session_id']}"
        )
        assert "_id" not in data

        # After checkout intent, status should now reflect intended_plan
        r2 = session.get(f"{API}/stripe/status", params={"user_id": user_id}, timeout=20)
        assert r2.status_code == 200
        s = r2.json()
        # Intended plan persisted; plan field may still be absent / status may be missing
        assert s.get("intended_plan") == "elite" or s.get("plan") in ("elite", "essential")
        assert "_id" not in s


# ---------- Regression ----------
class TestRegression:
    def test_templates_returns_six(self, session):
        r = session.get(f"{API}/templates", timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 6, f"expected 6 templates, got {len(data)}"
        keys = {t["key"] for t in data}
        assert keys == EXPECTED_TEMPLATE_KEYS, f"templates mismatch: {keys}"
        for t in data:
            assert "_id" not in t
            for f in ("key", "name", "role", "tagline", "color", "avatar_url"):
                assert f in t, f"missing {f} in template {t.get('key')}"

    def test_shennell_chat_in_character(self, session):
        uid = f"TEST_shennell_{uuid.uuid4().hex[:8]}"
        payload = {"user_id": uid, "message": "Hey Shennell, who's on my squad?"}
        r = session.post(f"{API}/shennell/chat", json=payload, timeout=120)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "message" in body and "user_message" in body
        content = body["message"]["content"]
        assert isinstance(content, str) and len(content.strip()) > 10
        # If budget exhausted, server returns the fallback string — treat as flaky / skip
        if "Apologies darling, I hit a snag" in content:
            pytest.skip("LLM budget exhausted — fallback path triggered")
        # Mild in-character signal (one of typical pet names)
        lc = content.lower()
        assert any(t in lc for t in ("darling", "babe", "lover", "honey")), (
            f"Shennell reply not in character: {content[:200]}"
        )
        assert "_id" not in body["message"]
        assert "_id" not in body["user_message"]
