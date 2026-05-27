import React, { useCallback, useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import ChatScreen from "@/src/components/ChatScreen";
import { Agent, apiGet, apiPost, getUserId, Message } from "@/src/api";
import { colors } from "@/src/theme";

export default function AgentChat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [userId, setUserId] = useState("");
  const [agent, setAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const uid = await getUserId();
      setUserId(uid);
      const [a, msgs] = await Promise.all([
        apiGet<Agent>(`/agents/${id}?user_id=${encodeURIComponent(uid)}`),
        apiGet<Message[]>(
          `/agents/${id}/messages?user_id=${encodeURIComponent(uid)}`,
        ),
      ]);
      setAgent(a);
      setMessages(msgs);
    } catch (e) {
      console.warn("load agent chat failed", e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const onSend = async (text: string) => {
    if (!userId || !id) return;
    setSending(true);
    const optimistic: Message = {
      id: `tmp_${Date.now()}`,
      agent_id: id,
      user_id: userId,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    try {
      const res = await apiPost<{ user_message: Message; message: Message }>(
        `/agents/${id}/chat`,
        { user_id: userId, message: text },
      );
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== optimistic.id);
        return [...filtered, res.user_message, res.message];
      });
    } catch (e) {
      console.warn("agent send failed", e);
      setMessages((prev) =>
        prev.filter((m) => m.id !== optimistic.id).concat({
          id: `err_${Date.now()}`,
          agent_id: id,
          user_id: userId,
          role: "assistant",
          content: "Hit a snag — try once more.",
          created_at: new Date().toISOString(),
        }),
      );
    } finally {
      setSending(false);
    }
  };

  const onGenerateImage = async (prompt: string) => {
    if (!userId || !id) return;
    setSending(true);
    const optimistic: Message = {
      id: `tmp_${Date.now()}`,
      agent_id: id,
      user_id: userId,
      role: "user",
      content: `[image] ${prompt}`,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    try {
      const res = await apiPost<{ user_message: Message; message: Message }>(
        `/agents/${id}/image`,
        { user_id: userId, prompt },
      );
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== optimistic.id);
        return [...filtered, res.user_message, res.message];
      });
    } catch (e) {
      console.warn("image gen failed", e);
      setMessages((prev) =>
        prev.filter((m) => m.id !== optimistic.id).concat({
          id: `err_${Date.now()}`,
          agent_id: id,
          user_id: userId,
          role: "assistant",
          content: "Image render failed — try a different prompt.",
          created_at: new Date().toISOString(),
        }),
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <ChatScreen
      headerTitle={agent?.name || "Agent"}
      headerSubtitle={agent?.role}
      headerAvatar={agent?.avatar_url || undefined}
      accentColor={agent?.color || colors.primary}
      testIdPrefix="agent-chat"
      messages={messages}
      loading={loading}
      sending={sending}
      onSend={onSend}
      onGenerateImage={agent?.can_generate_images ? onGenerateImage : undefined}
      onBack={() => router.back()}
      emptyHint={
        agent?.tagline ||
        `Start chatting with ${agent?.name || "your agent"}.`
      }
    />
  );
}
