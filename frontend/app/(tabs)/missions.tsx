import React, { useCallback, useEffect, useState } from "react";
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
import { colors, radius, spacing } from "@/src/theme";
import { apiGet, apiPost, getUserId } from "@/src/api";

type Preset = {
  key: string;
  name: string;
  tagline: string;
  agents: string[];
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

export default function MissionsTab() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [missions, setMissions] = useState<MissionSummary[]>([]);
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
          <Text style={styles.overline}>Mission Studio</Text>
          <Text style={styles.title}>Multi-agent missions</Text>
          <Text style={styles.subtitle}>
            One-tap orchestrations. Shennell deploys the right specialists in sequence.
          </Text>

          {loading ? (
            <ActivityIndicator color={colors.secondary} style={{ marginTop: spacing.xl }} />
          ) : (
            <View style={styles.presetList}>
              {presets.map((p) => {
                const isSelected = selected?.key === p.key;
                return (
                  <TouchableOpacity
                    key={p.key}
                    onPress={() => setSelected(isSelected ? null : p)}
                    activeOpacity={0.85}
                    style={[
                      styles.presetCard,
                      isSelected && { borderColor: p.color },
                    ]}
                    testID={`mission-preset-${p.key}`}
                  >
                    <LinearGradient
                      colors={[`${p.color}22`, "transparent"]}
                      style={StyleSheet.absoluteFill}
                    />
                    <View style={[styles.iconCircle, { backgroundColor: `${p.color}33`, borderColor: `${p.color}66` }]}>
                      <Ionicons name={p.icon as any} size={22} color={p.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.presetName}>{p.name}</Text>
                      <Text style={styles.presetTag}>{p.tagline}</Text>
                      <View style={styles.metaRow}>
                        <Text style={styles.metaText}>
                          {p.step_count} steps · {p.agents.map(a => a.toUpperCase()).join(" + ")}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {selected ? (
            <View style={styles.launchPanel}>
              <Text style={styles.fieldLabel}>Mission objective (optional)</Text>
              <TextInput
                value={objective}
                onChangeText={setObjective}
                placeholder={`e.g. "${
                  selected.key === "fda_awareness_pack"
                    ? "Focus on Red Dye 40 in childrens cereals"
                    : selected.key === "hollywood_3hr"
                    ? "A sci-fi thriller about an AI uprising in 2045"
                    : selected.key === "music_video"
                    ? "Dark synthwave anthem about reclaiming power"
                    : selected.key === "crypto_audit"
                    ? "My holdings: BTC 60%, ETH 25%, SOL 10%, cash 5%"
                    : "I'm forming a 2-founder SaaS LLC in Delaware"
                }"`}
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
                  colors={[selected.color, `${selected.color}99`]}
                  style={StyleSheet.absoluteFill}
                />
                {launching ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="flash" size={18} color="#fff" />
                    <Text style={styles.launchText}>Launch Mission</Text>
                  </>
                )}
              </TouchableOpacity>
              <Text style={styles.warnText}>
                Multi-step missions take ~30-90 seconds. Don&apos;t close the next screen.
              </Text>
            </View>
          ) : null}

          {missions.length > 0 ? (
            <View style={{ marginTop: spacing.xl }}>
              <Text style={styles.sectionLabel}>Recent Missions</Text>
              {missions.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={styles.missionRow}
                  onPress={() => router.push({ pathname: "/mission/[id]", params: { id: m.id } })}
                  testID={`mission-row-${m.id}`}
                >
                  <View style={[styles.statusDot, {
                    backgroundColor: m.status === "complete" ? colors.success : m.status === "failed" ? colors.danger : colors.secondary,
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

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: 140 },
  overline: { color: colors.secondary, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", fontWeight: "700" },
  title: { color: colors.textMain, fontSize: 34, fontWeight: "300", fontStyle: "italic", letterSpacing: -0.5, marginTop: spacing.sm },
  subtitle: { color: colors.textSubtle, fontSize: 14, marginTop: spacing.sm, lineHeight: 20, maxWidth: 340 },
  presetList: { marginTop: spacing.lg, gap: spacing.md },
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
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  presetName: {
    color: colors.textMain,
    fontSize: 17,
    fontWeight: "500",
    fontStyle: "italic",
    letterSpacing: 0.3,
  },
  presetTag: { color: colors.textSubtle, fontSize: 12, marginTop: 2, lineHeight: 16 },
  metaRow: { marginTop: 6 },
  metaText: {
    color: colors.textFaint,
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  launchPanel: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderColor: colors.border,
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
  warnText: {
    marginTop: spacing.sm,
    color: colors.textFaint,
    fontSize: 11,
    fontStyle: "italic",
    textAlign: "center",
  },
  sectionLabel: {
    color: colors.textSubtle,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontWeight: "600",
    marginBottom: spacing.sm,
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
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  missionName: { color: colors.textMain, fontSize: 14, fontWeight: "500" },
  missionObjective: { color: colors.textSubtle, fontSize: 12, marginTop: 2 },
});
