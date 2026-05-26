import React, { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import ChatScreen from "@/src/components/ChatScreen";
import { apiGet, apiPost, getUserId, Message } from "@/src/api";
import { MEDIA, colors } from "@/src/theme";

export default function ShennellTab() {
  const [userId, setUserId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const loadHistory = useCallback(async (uid: string) => {
    try {
      const data = await apiGet<Message[]>(
        `/shennell/messages?user_id=${encodeURIComponent(uid)}`,
      );
      setMessages(data);
    } catch (e) {
      console.warn("Failed to load Shennell history", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const uid = await getUserId();
        if (!active) return;
        setUserId(uid);
        await loadHistory(uid);
      })();
      return () => {
        active = false;
      };
    }, [loadHistory]),
  );

  useEffect(() => {
    (async () => {
      const uid = await getUserId();
      setUserId(uid);
      await loadHistory(uid);
    })();
  }, [loadHistory]);

  const onSend = async (text: string) => {
    if (!userId) return;
    setSending(true);
    // Optimistic user message
    const optimistic: Message = {
      id: `tmp_${Date.now()}`,
      agent_id: "shennell",
      user_id: userId,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    try {
      const res = await apiPost<{ user_message: Message; message: Message }>(
        "/shennell/chat",
        { user_id: userId, message: text },
      );
      setMessages((prev) => {
        // Replace optimistic with real, append AI response
        const filtered = prev.filter((m) => m.id !== optimistic.id);
        return [...filtered, res.user_message, res.message];
      });
    } catch (e) {
      console.warn("Shennell send failed", e);
      setMessages((prev) =>
        prev.filter((m) => m.id !== optimistic.id).concat({
          id: `err_${Date.now()}`,
          agent_id: "shennell",
          user_id: userId,
          role: "assistant",
          content: "Connection hiccup, darling. Try again.",
          created_at: new Date().toISOString(),
        }),
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <ChatScreen
      headerTitle="Shennell"
      headerSubtitle="Your ruthless right hand"
      headerAvatar={MEDIA.shennell}
      accentColor={colors.primary}
      testIdPrefix="shennell"
      messages={messages}
      loading={loading}
      sending={sending}
      onSend={onSend}
      emptyHint="Tell Shennell what you want to build, hunt, heal, or conquer. She'll deploy the right squad."
    />
  );
}
