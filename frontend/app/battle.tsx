import React, { useEffect, useState } from "react";
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
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { agentPalette, colors, radius, spacing } from "@/src/theme";
import { apiGet, apiPost, AgentTemplate } from "@/src/api";

type BattleResult = {
  agent_key: string;
  agent_name: string;
  role: string;
  color: string;
  output: string;
  status: string;
};

export default function BattleMode() {
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<BattleResult[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const t = await apiGet<AgentTemplate[]>("/templates");
        setTemplates(t);
      } catch {}
    })();
  }, []);

  const toggle = (k: string) => {
    setSelected((prev) =>
      prev.includes(k)
        ? prev.filter((x) => x !== k)
        : prev.length >= 4
        ? (Alert.alert("Max 4 combatants"), prev)
        : [...prev, k],
    );
  };

  const fight = async () => {
    if (selected.length < 2) {
      Alert.alert("Need ≥ 2 combatants", "Pick at least 2 agents to battle.");
      return;
    }
    if (!prompt.trim()) {
      Alert.alert("Drop the question", "Give the agents something to fight over.");
      return;
    }
    setRunning(true);
    setResults([]);
    try {
      const res = await apiPost<{ results: BattleResult[] }>("/battle", {
        prompt: prompt.trim(),
        agent_keys: selected,
      });
      setResults(res.results);
    } catch (e: any) {
      Alert.alert("Battle failed", e?.message || "Try again");
    } finally {
      setRunning(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} testID="battle-back">
          <Ionicons name="chevron-back" size={22} color={colors.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Battle Mode</Text>
        <View style={styles.iconBtn} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.overline}>Compare Agents</Text>
          <Text style={styles.title}>Pit them against each other</Text>
          <Text style={styles.subtitle}>
            Same prompt, multiple agents, side-by-side. See whose mind cuts cleanest.
          </Text>

          <Text style={styles.fieldLabel}>Combatants ({selected.length}/4)</Text>
          <View style={styles.combatantRow}>
            {templates.map((t) => {
              const pal = agentPalette[t.key];
              const active = selected.includes(t.key);
              return (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => toggle(t.key)}
                  style={[
                    styles.combatant,
                    active && { borderColor: pal?.main, backgroundColor: `${pal?.main}22` },
                  ]}
                  testID={`battle-pick-${t.key}`}
                >
                  <View style={[styles.combatantDot, { backgroundColor: pal?.main }]} />
                  <Text style={[styles.combatantName, active && { color: pal?.main }]}>{t.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.fieldLabel}>The Question</Text>
          <TextInput
            value={prompt}
            onChangeText={setPrompt}
            placeholder="What should LEXIS, CIPHER, AXIOM and NOVA fight over?"
            placeholderTextColor={colors.textFaint}
            style={[styles.input, styles.textarea]}
            multiline
            testID="battle-prompt"
          />

          <TouchableOpacity
            style={[styles.fightBtn, (running || selected.length < 2) && { opacity: 0.5 }]}
            onPress={fight}
            disabled={running || selected.length < 2}
            testID="battle-start-btn"
          >
            <LinearGradient
              colors={["#FF2D9F", "#9333EA", "#1FB6FF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            {running ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="flash" size={18} color="#fff" />
                <Text style={styles.fightText}>Start Battle</Text>
              </>
            )}
          </TouchableOpacity>

          {results.length > 0 ? (
            <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerLabel}>RESULTS</Text>
                <View style={styles.dividerLine} />
              </View>
              {results.map((r) => {
                const pal = agentPalette[r.agent_key];
                return (
                  <View key={r.agent_key} style={[styles.resultCard, { borderColor: `${pal?.main}66` }]}>
                    <LinearGradient
                      colors={[`${pal?.main}22`, "transparent"]}
                      style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.resultHeader}>
                      <View style={[styles.combatantDot, { backgroundColor: pal?.main, width: 12, height: 12 }]} />
                      <Text style={[styles.resultName, { color: pal?.main }]}>{r.agent_name}</Text>
                      <Text style={styles.resultRole}>{r.role}</Text>
                    </View>
                    <Text style={styles.resultOutput}>{r.output}</Text>
                  </View>
                );
              })}
            </View>
          ) : null}
          <View style={{ height: 80 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: colors.muted },
  headerTitle: { flex: 1, textAlign: "center", color: colors.textMain, fontSize: 16, fontWeight: "500", letterSpacing: 2, textTransform: "uppercase" },
  scroll: { padding: spacing.lg, paddingBottom: 40 },
  overline: { color: "#FF2D9F", fontSize: 11, letterSpacing: 3, textTransform: "uppercase", fontWeight: "700" },
  title: { color: colors.textMain, fontSize: 32, fontWeight: "300", fontStyle: "italic", marginTop: spacing.sm },
  subtitle: { color: colors.textSubtle, fontSize: 14, marginTop: spacing.sm, lineHeight: 20, maxWidth: 340 },
  fieldLabel: { color: colors.textSubtle, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", fontWeight: "600", marginTop: spacing.lg, marginBottom: 8 },
  combatantRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  combatant: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: spacing.md, paddingVertical: 10,
    backgroundColor: colors.muted, borderColor: colors.border, borderWidth: 1,
    borderRadius: radius.pill,
  },
  combatantDot: { width: 8, height: 8, borderRadius: 4 },
  combatantName: { color: colors.textMain, fontSize: 13, fontWeight: "700", letterSpacing: 0.5 },
  input: { backgroundColor: colors.muted, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, color: colors.textMain, fontSize: 14 },
  textarea: { minHeight: 90, textAlignVertical: "top" },
  fightBtn: {
    marginTop: spacing.lg, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: spacing.sm, paddingVertical: 16, borderRadius: radius.pill, overflow: "hidden",
  },
  fightText: { color: "#fff", fontSize: 14, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerLabel: { color: "#FF2D9F", fontSize: 11, letterSpacing: 3, fontWeight: "700" },
  resultCard: {
    backgroundColor: colors.surface, borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, overflow: "hidden",
  },
  resultHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  resultName: { fontSize: 16, fontWeight: "700", fontStyle: "italic", letterSpacing: 0.5 },
  resultRole: { color: colors.textFaint, fontSize: 11, letterSpacing: 1 },
  resultOutput: { color: colors.textMain, fontSize: 14, lineHeight: 22 },
});
