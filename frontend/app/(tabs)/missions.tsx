import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { agentPalette, badgeStyle, categoryPalette, colors, radius, spacing } from "@/src/theme";
import { apiGet, apiPost, getUserId } from "@/src/api";

type Preset = {
  key: string;
  name: string;
  tagline: string;
  agents: string[];
  category: string;
  badge?: string | null;
  color: string;
  icon: string;
  step_count: number;
};

type MissionSummary = {
  id: string;
  preset_name: string;
  objective: string;
  status: string;
  created_at: string;
};

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "legal", label: "Legal" },
  { key: "finance", label: "Finance" },
  { key: "health", label: "Health" },
  { key: "creative", label: "Creative" },
  { key: "music", label: "Music" },
  { key: "security", label: "Security" },
  { key: "crossover", label: "Crossover" },
];

export default function MissionsTab() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [missions, setMissions] = useState<MissionSummary[]>([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [selected, setSelected] = useState<Preset | null>(null);
  const [objective, setObjective] = useState("");
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);

  const load = useCallback(async () => {
    try {
      const uid = await getUserId();
      const [p, m] = await Promise.all([
        apiGet<Preset[]>("/missions/presets"),
        apiGet<MissionSummary[]>(`/missions?user_id=${encodeURIComponent(uid)}`),
      ]);
      setPresets(p);
      setMissions(m);
    } catch (e) {
      console.warn("load missions failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(() => {
    if (activeCategory === "all") return presets;
    return presets.filter((p) => p.category === activeCategory);
  }, [presets, activeCategory]);

  const launch = async () => {
    if (!selected || launching) return;
    setLaunching(true);
    try {
      const uid = await getUserId();
      const mission = await apiPost<{ id: string }>("/missions/launch", {
        user_id: uid,
        preset_key: selected.key,
        objective: objective.trim(),
      });
      setSelected(null);
      setObjective("");
      router.push({ pathname: "/mission/[id]", params: { id: mission.id } });
    } catch (e: any) {
      Alert.alert("Launch failed", e?.message || "Could not launch mission");
    } finally {
      setLaunching(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.headerWrap}>
            <Text style={styles.overline}>Mission Studio</Text>
            <Text style={styles.title}>Deploy a strike force</Text>
            <Text style={styles.subtitle}>
              15 preset missions. Stack agents. Get receipts.
            </Text>
          </View>

          {/* Custom Mission CTA */}
          <TouchableOpacity
            onPress={() => router.push("/create-mission")}
            activeOpacity={0.9}
            style={styles.customCta}
            testID="create-custom-mission-btn"
          >
            <LinearGradient
              colors={["#D4AF37", "#9333EA"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.customCtaInner}>
              <View style={styles.customCtaIcon}>
                <Ionicons name="flash" size={20} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.customCtaTitle}>Custom Mission</Text>
                <Text style={styles.customCtaSub}>Agent Fusion · pick any 1-5 agents</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#fff" />
            </View>
          </TouchableOpacity>

          {/* Category filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.key;
              const pal = cat.key === "all" ? null : categoryPalette[cat.key];
              return (
                <TouchableOpacity
                  key={cat.key}
                  onPress={() => setActiveCategory(cat.key)}
                  style={[
                    styles.chip,
                    isActive && {
                      backgroundColor: pal ? `${pal.main}33` : `${colors.secondary}33`,
                      borderColor: pal ? pal.main : colors.secondary,
                    },
                  ]}
                  testID={`category-chip-${cat.key}`}
                >
                  <Text
                    style={[
                      styles.chipText,
                      isActive && {
                        color: pal ? pal.main : colors.secondary,
                      },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {loading ? (
            <ActivityIndicator color={colors.secondary} style={{ marginTop: spacing.xl }} />
          ) : (
            <View style={styles.presetList}>
              {filtered.map((p) => {
                const isSelected = selected?.key === p.key;
                const pal = categoryPalette[p.category] || categoryPalette.crossover;
                const badge = p.badge ? badgeStyle[p.badge] : null;
                return (
                  <TouchableOpacity
                    key={p.key}
                    onPress={() => setSelected(isSelected ? null : p)}
                    activeOpacity={0.85}
                    style={[
                      styles.presetCard,
                      isSelected && {
                        borderColor: pal.main,
                        shadowColor: pal.main,
                      },
                    ]}
                    testID={`mission-preset-${p.key}`}
                  >
                    <LinearGradient
                      colors={[`${pal.main}33`, `${pal.accent}11`, "transparent"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    {/* Glow halo */}
                    <View style={[styles.haloOuter, { borderColor: `${pal.main}44` }]}>
                      <View style={[styles.haloInner, { backgroundColor: `${pal.main}22`, borderColor: `${pal.main}88` }]}>
                        <Ionicons name={p.icon as any} size={26} color={pal.main} />
                      </View>
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={styles.cardTopRow}>
                        <Text style={styles.presetName}>{p.name}</Text>
                        {badge ? (
                          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                            <Text style={[styles.badgeText, { color: badge.fg }]}>{badge.label}</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.presetTag}>{p.tagline}</Text>
                      <View style={styles.agentsRow}>
                        {p.agents.map((a) => {
                          const ap = agentPalette[a];
                          return (
                            <View
                              key={a}
                              style={[
                                styles.agentPill,
                                { backgroundColor: `${ap?.main || colors.muted}22`, borderColor: `${ap?.main || colors.border}66` },
                              ]}
                            >
                              <Text style={[styles.agentPillText, { color: ap?.main || colors.textSubtle }]}>
                                {a.toUpperCase()}
                              </Text>
                            </View>
                          );
                        })}
                        <View style={styles.stepCount}>
                          <Ionicons name="layers-outline" size={11} color={colors.textFaint} />
                          <Text style={styles.stepCountText}>{p.step_count}</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
              {filtered.length === 0 ? (
                <Text style={styles.emptyFilter}>No missions in this category yet.</Text>
              ) : null}
            </View>
          )}

          {/* Launch panel */}
          {selected ? (
            <View style={[styles.launchPanel, { borderColor: (categoryPalette[selected.category] || categoryPalette.crossover).main }]}>
              <Text style={styles.fieldLabel}>Mission objective</Text>
              <TextInput
                value={objective}
                onChangeText={setObjective}
                placeholder="Be specific. Shennell deploys what you describe."
                placeholderTextColor={colors.textFaint}
                style={[styles.input, styles.textarea]}
                multiline
                testID="mission-objective-input"
              />
              <TouchableOpacity
                style={[styles.launchBtn, launching && { opacity: 0.6 }]}
                onPress={launch}
                disabled={launching}
                testID="launch-mission-btn"
              >
                <LinearGradient
                  colors={(categoryPalette[selected.category] || categoryPalette.crossover).grad}
                  style={StyleSheet.absoluteFill}
                />
                {launching ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="flash" size={18} color="#fff" />
                    <Text style={styles.launchText}>Deploy Mission</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Recent missions */}
          {missions.length > 0 ? (
            <View style={{ marginTop: spacing.xl }}>
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerLabel}>Recent Operations</Text>
                <View style={styles.dividerLine} />
              </View>
              {missions.slice(0, 8).map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={styles.missionRow}
                  onPress={() => router.push({ pathname: "/mission/[id]", params: { id: m.id } })}
                  testID={`mission-row-${m.id}`}
                >
                  <View style={[styles.statusDotPulse, {
                    backgroundColor: m.status === "complete" ? colors.success : m.status === "failed" ? colors.danger : colors.secondary,
                    shadowColor: m.status === "complete" ? colors.success : m.status === "failed" ? colors.danger : colors.secondary,
                  }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.missionName} numberOfLines={1}>{m.preset_name}</Text>
                    <Text style={styles.missionObjective} numberOfLines={1}>
                      {m.objective || "No specific brief"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: 140 },
  headerWrap: { marginBottom: spacing.md },
  overline: { color: colors.secondary, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", fontWeight: "700" },
  title: { color: colors.textMain, fontSize: 36, fontWeight: "300", fontStyle: "italic", letterSpacing: -0.5, marginTop: spacing.sm },
  subtitle: { color: colors.textSubtle, fontSize: 14, marginTop: spacing.sm, lineHeight: 20, maxWidth: 340 },

  customCta: {
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    overflow: "hidden",
    position: "relative",
  },
  customCtaInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    gap: spacing.md,
  },
  customCtaIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
  },
  customCtaTitle: { color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.3 },
  customCtaSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 },

  chipRow: { paddingVertical: spacing.lg, gap: spacing.sm, paddingRight: spacing.lg },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.muted,
    marginRight: spacing.sm,
  },
  chipText: { color: colors.textSubtle, fontSize: 12, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase" },

  presetList: { gap: spacing.md },
  presetCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    overflow: "hidden",
    gap: spacing.md,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 4,
  },
  haloOuter: {
    width: 64, height: 64, borderRadius: 32,
    borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
  },
  haloInner: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  presetName: {
    color: colors.textMain,
    fontSize: 17,
    fontWeight: "600",
    fontStyle: "italic",
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  badgeText: { fontSize: 9, fontWeight: "800", letterSpacing: 1.5 },
  presetTag: { color: colors.textSubtle, fontSize: 12, marginTop: 4, lineHeight: 17 },
  agentsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    flexWrap: "wrap",
  },
  agentPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  agentPillText: { fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  stepCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginLeft: 4,
  },
  stepCountText: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: "600",
  },
  emptyFilter: {
    color: colors.textFaint,
    fontSize: 13,
    textAlign: "center",
    paddingVertical: spacing.xl,
    fontStyle: "italic",
  },

  launchPanel: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  fieldLabel: {
    color: colors.textSubtle,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.muted,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.textMain,
    fontSize: 14,
  },
  textarea: { minHeight: 80, textAlignVertical: "top", paddingTop: 12 },
  launchBtn: {
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: 16,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  launchText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
  },

  dividerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerLabel: {
    color: colors.secondary,
    fontSize: 11,
    letterSpacing: 3,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  missionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  statusDotPulse: {
    width: 9, height: 9, borderRadius: 5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  missionName: { color: colors.textMain, fontSize: 14, fontWeight: "500" },
  missionObjective: { color: colors.textSubtle, fontSize: 12, marginTop: 2 },
});
