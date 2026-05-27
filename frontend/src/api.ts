import { storage } from "@/src/utils/storage";

const USER_ID_KEY = "shennell_user_id";
const AUTH_TOKEN_KEY = "shennell_access_token";

function genId(): string {
  // RFC-ish unique enough for local user id
  return (
    "u_" +
    Date.now().toString(36) +
    "_" +
    Math.random().toString(36).slice(2, 10)
  );
}

export async function getUserId(): Promise<string> {
  const existing = await storage.getItem<string>(USER_ID_KEY, "");
  if (existing && existing.length > 0) return existing;
  const id = genId();
  await storage.setItem(USER_ID_KEY, id);
  return id;
}

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export const API = `${BACKEND_URL}/api`;

type SessionResponse = {
  access_token: string;
  token_type: "bearer";
  expires_at: string;
  user_id: string;
};

type ApiErrorShape = {
  detail?: string;
  message?: string;
};

async function readErrorMessage(res: Response): Promise<string> {
  const text = await res.text();
  if (!text) return `${res.status}`;

  try {
    const parsed = JSON.parse(text) as ApiErrorShape;
    return parsed.detail || parsed.message || text;
  } catch {
    return text;
  }
}

async function createSession(userId: string): Promise<SessionResponse> {
  const res = await fetch(`${API}/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId }),
  });
  if (!res.ok) {
    const message = await readErrorMessage(res);
    throw new Error(`POST /session failed: ${res.status} ${message}`);
  }
  return (await res.json()) as SessionResponse;
}

async function getAccessToken(): Promise<string> {
  const existing = await storage.secureGet<string>(AUTH_TOKEN_KEY, "");
  if (existing && existing.length > 0) return existing;

  const userId = await getUserId();
  const session = await createSession(userId);
  await storage.secureSet(AUTH_TOKEN_KEY, session.access_token);
  return session.access_token;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  return { Authorization: `Bearer ${token}` };
}

export async function clearSession(): Promise<void> {
  await storage.secureRemove(AUTH_TOKEN_KEY);
}

export async function apiGet<T>(path: string): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API}${path}`, { headers });
  if (!res.ok) {
    const message = await readErrorMessage(res);
    throw new Error(`GET ${path} failed: ${res.status} ${message}`);
  }
  return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const message = await readErrorMessage(res);
    throw new Error(`POST ${path} failed: ${res.status} ${message}`);
  }
  return res.json();
}

export async function apiDelete<T>(path: string): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API}${path}`, { method: "DELETE", headers });
  if (!res.ok) {
    const message = await readErrorMessage(res);
    throw new Error(`DELETE ${path} failed: ${res.status} ${message}`);
  }
  return res.json();
}

// Types
export type AgentTemplate = {
  key: string;
  name: string;
  role: string;
  tagline: string;
  color: string;
  avatar_url: string;
  can_generate_images?: boolean;
};

export type Agent = {
  id: string;
  user_id: string;
  name: string;
  role: string;
  tagline: string;
  color: string;
  avatar_url?: string;
  template_key?: string;
  can_generate_images?: boolean;
  created_at: string;
};

export type Message = {
  id: string;
  agent_id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  image_b64?: string | null;
  created_at: string;
};
