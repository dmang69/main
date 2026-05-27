import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius, spacing } from "@/src/theme";
import { apiGet, getUserId } from "@/src/api";

type MissionSummary = {
  id: string;
  preset_name: string;
  objective: string;
  status: string;
  preset_key: string;
  created_at: string;
  steps: { step_index: number; title: string; agent_key: string; output: string }[];
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "complete", label: "Complete" },
  { key: "running", label: "Live" },
  { key: "failed", label: "Failed" },
];

export default function VaultTab() {
  const [missions, setMissions] = useState<MissionSummary[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const uid = await getUserId();
      const data = await apiGet<MissionSummary[]>(
        `/missions?user_id=${encodeURIComponent(uid)}`,
      );
      setMissions(data);
    } catch (e) {
      console.warn("vault load failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const filtered = useMemo(() => {
    if (filter === "all") return missions;
    return missions.filter((m) => m.status === filter);
  }, [missions, filter]);

  const stats = useMemo(() => {
    const total = missions.length;
    const complete = missions.filter((m) => m.status === "complete").length;
    const running = missions.filter((m) => m.status === "running").length;
    const totalOutputs = missions.reduce((sum, m) => sum + (m.steps?.length || 0), 0);
    return { total, complete, running, totalOutputs };
  }, [missions]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.overline}>Output Vault</Text>
        <Text style={styles.title}>Your archive</Text>
        <Text style={styles.subtitle}>
          Every mission output. Searchable, retrievable, exportable.
        </Text>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard label="Missions" value={stats.total} accent={colors.secondary} />
          <StatCard label="Complete" value={stats.complete} accent={colors.success} />
          <StatCard label="Live" value={stats.running} accent={colors.warning} />
          <StatCard label="Outputs" value={stats.totalOutputs} accent="#9333EA" />
        </View>

        {/* Filters */}
        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
              testID={`vault-filter-${f.key}`}
            >
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.secondary} style={{ marginTop: spacing.xl }} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="archive-outline" size={48} color={colors.textFaint} />
            <Text style={styles.emptyTitle}>Vault is empty</Text>
            <Text style={styles.emptyHint}>
              {filter === "all"
                ? "Run a mission and it'll be stored here for life."
                : `No ${filter} missions yet.`}
            </Text>
            {filter === "all" ? (
              <TouchableOpacity
                style={styles.emptyCta}
                onPress={() => router.push("/missions")}
                testID="vault-empty-cta"
              >
                <Text style={styles.emptyCtaText}>Launch first mission</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <View style={{ gap: spacing.md }}>
            {filtered.map((m) => (
              <TouchableOpacity
                key={m.id}
                onPress={() => router.push({ pathname: "/mission/[id]", params: { id: m.id } })}
                style={styles.vaultCard}
                activeOpacity={0.85}
                testID={`vault-card-${m.id}`}
              >
                <LinearGradient
                  colors={[
                    m.status === "complete" ? "rgba(16,185,129,0.15)" :
                    m.status === "failed" ? "rgba(255,77,109,0.15)" :
                    "rgba(245,158,11,0.15)",
                    "transparent",
                  ]}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.vaultHeader}>
                  <View style={[styles.statusChip, {
                    backgroundColor:
                      m.status === "complete" ? `${colors.success}22` :
                      m.status === "failed" ? `${colors.danger}22` :
                      `${colors.warning}22`,
                  }]}>
                    {m.status === "running" ? (
                      <ActivityIndicator size="small" color={colors.warning} />
                    ) : (
                      <Ionicons
                        name={m.status === "complete" ? "checkmark" : "alert"}
                        size={12}
                        color={m.status === "complete" ? colors.success : colors.danger}
                      />
                    )}
                    <Text style={[styles.statusText, {
                      color:
                        m.status === "complete" ? colors.success :
                        m.status === "failed" ? colors.danger :
                        colors.warning,
                    }]}>
                      {m.status.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.dateText}>
                    {new Date(m.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.vaultName} numberOfLines={1}>{m.preset_name}</Text>
                {m.objective ? (
                  <Text style={styles.vaultObjective} numberOfLines={2}>{m.objective}</Text>
                ) : null}
                <View style={styles.vaultFooter}>
                  <Ionicons name="layers-outline" size={13} color={colors.textFaint} />
                  <Text style={styles.outputCount}>
                    {m.steps?.length || 0} outputs
                  </Text>
                  <View style={{ flex: 1 }} />
                  <Text style={styles.openText}>OPEN</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.secondary} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <View style={[styles.statCard, { borderColor: `${accent}55` }]}>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: 140 },
  overline: { color: colors.secondary, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", fontWeight: "700" },
  title: { color: colors.textMain, fontSize: 36, fontWeight: "300", fontStyle: "italic", letterSpacing: -0.5, marginTop: spacing.sm },
  subtitle: { color: colors.textSubtle, fontSize: 14, marginTop: spacing.sm, lineHeight: 20, maxWidth: 340 },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
  },
  statValue: { fontSize: 24, fontWeight: "700" },
  statLabel: {
    color: colors.textSubtle,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    fontWeight: "600",
    marginTop: 4,
  },
  filterRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.muted,
  },
  filterChipActive: {
    backgroundColor: `${colors.secondary}22`,
    borderColor: colors.secondary,
  },
  filterText: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  filterTextActive: { color: colors.secondary },
  emptyState: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    color: colors.textMain,
    fontSize: 18,
    fontWeight: "500",
    fontStyle: "italic",
    marginTop: spacing.md,
  },
  emptyHint: {
    color: colors.textSubtle,
    fontSize: 13,
    textAlign: "center",
    marginTop: spacing.sm,
    maxWidth: 260,
  },
  emptyCta: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: radius.pill,
  },
  emptyCtaText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  vaultCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    overflow: "hidden",
  },
  vaultHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  statusText: { fontSize: 9, fontWeight: "800", letterSpacing: 1.5 },
  dateText: { color: colors.textFaint, fontSize: 11, letterSpacing: 1 },
  vaultName: {
    color: colors.textMain,
    fontSize: 17,
    fontWeight: "600",
    fontStyle: "italic",
    letterSpacing: 0.3,
  },
  vaultObjective: {
    color: colors.textSubtle,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },
  vaultFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  outputCount: { color: colors.textFaint, fontSize: 11, fontWeight: "600" },
  openText: { color: colors.secondary, fontSize: 11, fontWeight: "700", letterSpacing: 1.5 },
});
