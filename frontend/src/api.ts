import { storage } from "@/src/utils/storage";

const USER_ID_KEY = "shennell_user_id";

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

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${path} failed: ${res.status} ${text}`);
  }
  return res.json();
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
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
