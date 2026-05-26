import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius, spacing } from "@/src/theme";
import { Agent, apiDelete, apiGet, getUserId } from "@/src/api";

const MAX_AGENTS = 5;

export default function AgentsTab() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const uid = await getUserId();
      const data = await apiGet<Agent[]>(
        `/agents?user_id=${encodeURIComponent(uid)}`,
      );
      setAgents(data);
    } catch (e) {
      console.warn("Failed to load agents", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const slots = Array.from({ length: MAX_AGENTS }, (_, i) => agents[i] || null);

  const confirmDelete = (agent: Agent) => {
    Alert.alert(
      "Dismiss agent?",
      `${agent.name} will be removed from your squad. This deletes their chat history too.`,
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Dismiss",
          style: "destructive",
          onPress: async () => {
            await apiDelete(`/agents/${agent.id}`);
            refresh();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.overline}>The Squad</Text>
          <Text style={styles.title}>Your Five</Text>
          <Text style={styles.subtitle}>
            Up to five specialized minds. Each one ruthless in their craft.
          </Text>
        </View>

        <View style={styles.counter}>
          <Text style={styles.counterText} testID="agents-counter">
            {agents.length} / {MAX_AGENTS} active
          </Text>
        </View>

        <View style={styles.grid}>
          {slots.map((agent, idx) => (
            <View key={idx} style={styles.slotWrapper}>
              {agent ? (
                <AgentCard agent={agent} onDelete={() => confirmDelete(agent)} />
              ) : (
                <EmptySlot index={idx + 1} disabled={loading} />
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AgentCard({ agent, onDelete }: { agent: Agent; onDelete: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.card, { borderColor: `${agent.color}55` }]}
      activeOpacity={0.85}
      onPress={() => router.push({ pathname: "/agent/[id]", params: { id: agent.id } })}
      testID={`agent-card-${agent.template_key || agent.id}`}
    >
      <LinearGradient
        colors={[`${agent.color}33`, "transparent"]}
        style={styles.cardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      {agent.avatar_url ? (
        <Image source={{ uri: agent.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, { backgroundColor: agent.color }]}>
          <Text style={styles.avatarInitial}>{agent.name.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <Text style={styles.agentName} numberOfLines={1}>
        {agent.name}
      </Text>
      <Text style={styles.agentRole} numberOfLines={2}>
        {agent.role}
      </Text>
      <View style={[styles.colorBar, { backgroundColor: agent.color }]} />
      <TouchableOpacity
        onPress={onDelete}
        style={styles.deleteBtn}
        hitSlop={10}
        testID={`delete-agent-${agent.id}`}
      >
        <Ionicons name="close" size={14} color={colors.textSubtle} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function EmptySlot({ index, disabled }: { index: number; disabled: boolean }) {
  return (
    <TouchableOpacity
      style={styles.emptySlot}
      onPress={() => router.push("/create-agent")}
      disabled={disabled}
      activeOpacity={0.7}
      testID={`empty-slot-${index}`}
    >
      <View style={styles.plusCircle}>
        <Ionicons name="add" size={28} color={colors.secondary} />
      </View>
      <Text style={styles.emptyLabel}>Slot {index}</Text>
      <Text style={styles.emptyHint}>Deploy agent</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: 120 },
  header: { marginBottom: spacing.lg },
  overline: {
    color: colors.secondary,
    fontSize: 11,
    letterSpacing: 3,
    textTransform: "uppercase",
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.textMain,
    fontSize: 38,
    fontWeight: "300",
    letterSpacing: -0.5,
    fontStyle: "italic",
  },
  subtitle: {
    color: colors.textSubtle,
    fontSize: 14,
    marginTop: spacing.sm,
    lineHeight: 20,
    maxWidth: 320,
  },
  counter: {
    alignSelf: "flex-start",
    backgroundColor: colors.muted,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    marginBottom: spacing.lg,
  },
  counterText: {
    color: colors.textMain,
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  slotWrapper: {
    width: "47%",
    aspectRatio: 0.85,
  },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    overflow: "hidden",
    justifyContent: "space-between",
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  avatarInitial: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "600",
  },
  agentName: {
    color: colors.textMain,
    fontSize: 20,
    fontWeight: "500",
    letterSpacing: 0.3,
    fontStyle: "italic",
  },
  agentRole: {
    color: colors.textSubtle,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  colorBar: {
    height: 3,
    width: 32,
    borderRadius: 2,
    marginTop: spacing.sm,
  },
  deleteBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptySlot: {
    flex: 1,
    backgroundColor: "rgba(12,12,16,0.5)",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    padding: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  plusCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(212,175,55,0.1)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  emptyLabel: {
    color: colors.textSubtle,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  emptyHint: {
    color: colors.secondary,
    fontSize: 13,
    marginTop: 4,
    fontStyle: "italic",
  },
});
