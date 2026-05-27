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
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { agentPalette, colors, radius, spacing } from "@/src/theme";
import { apiGet, apiPost, AgentTemplate, getUserId } from "@/src/api";

const TONES = ["aggressive", "diplomatic", "neutral", "creative", "surgical"] as const;
const OUTPUT_TYPES = ["brief", "full document", "checklist", "outline", "campaign pack"] as const;
const PRIORITIES = [
  { key: "standard", label: "Standard" },
  { key: "high", label: "High" },
  { key: "emergency", label: "Emergency" },
] as const;

export default function CreateMission() {
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [tone, setTone] = useState<string>("");
  const [outputType, setOutputType] = useState<string>("");
  const [priority, setPriority] = useState<string>("standard");
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        const t = await apiGet<AgentTemplate[]>("/templates");
        setTemplates(t);
      } catch (e) {
        console.warn(e);
      }
    })();
  }, []);

  const toggleAgent = (key: string) => {
    setSelectedAgents((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= 5) {
        Alert.alert("Max 5 agents", "Pick up to five operatives per mission.");
        return prev;
      }
      return [...prev, key];
    });
  };

  const launch = async () => {
    if (submitting) return;
    if (!objective.trim()) {
      Alert.alert("Mission needs an objective", "Tell Shennell what you want done.");
      return;
    }
    if (selectedAgents.length === 0) {
      Alert.alert("Pick agents", "Select at least one specialist for this mission.");
      return;
    }
    setSubmitting(true);
    try {
      const uid = await getUserId();
      const m = await apiPost<{ id: string }>("/missions/custom", {
        user_id: uid,
        name: name.trim() || "Custom Mission",
        objective: objective.trim(),
        agent_keys: selectedAgents,
        tone,
        output_type: outputType,
        priority,
      });
      router.replace({ pathname: "/mission/[id]", params: { id: m.id } });
    } catch (e: any) {
      Alert.alert("Launch failed", e?.message || "Could not launch mission");
    } finally {
      setSubmitting(false);
    }
  };

  const canLaunch = useMemo(
    () => objective.trim().length > 0 && selectedAgents.length > 0,
    [objective, selectedAgents],
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.iconBtn}
          testID="create-mission-close"
        >
          <Ionicons name="close" size={22} color={colors.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mission Builder</Text>
        <View style={styles.iconBtn} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.overline}>Agent Fusion</Text>
          <Text style={styles.title}>Forge a custom mission</Text>
          <Text style={styles.subtitle}>
            Stack 1-5 specialists. Each runs sequentially, building on the prior's output.
          </Text>

          {/* Name */}
          <Text style={styles.fieldLabel}>Mission name (optional)</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Quarterly Empire Audit"
            placeholderTextColor={colors.textFaint}
            style={styles.input}
            testID="mission-name-input"
          />

          {/* Objective */}
          <Text style={styles.fieldLabel}>Objective</Text>
          <TextInput
            value={objective}
            onChangeText={setObjective}
            placeholder="What do you want done? Be specific."
            placeholderTextColor={colors.textFaint}
            style={[styles.input, styles.textarea]}
            multiline
            testID="mission-objective"
          />

          {/* Agent picker */}
          <Text style={styles.fieldLabel}>Agents ({selectedAgents.length}/5)</Text>
          <View style={styles.agentGrid}>
            {templates.map((t) => {
              const pal = agentPalette[t.key] || agentPalette.lexis;
              const isSelected = selectedAgents.includes(t.key);
              return (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => toggleAgent(t.key)}
                  activeOpacity={0.85}
                  style={[
                    styles.agentChip,
                    isSelected && {
                      backgroundColor: `${pal.main}22`,
                      borderColor: pal.main,
                    },
                  ]}
                  testID={`agent-pick-${t.key}`}
                >
                  <View style={[styles.dot, { backgroundColor: pal.main }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.agentChipName, isSelected && { color: pal.main }]}>
                      {t.name}
                    </Text>
                    <Text style={styles.agentChipRole} numberOfLines={1}>{t.role}</Text>
                  </View>
                  {isSelected ? (
                    <View style={[styles.checkPill, { backgroundColor: pal.main }]}>
                      <Text style={styles.checkPillText}>
                        {selectedAgents.indexOf(t.key) + 1}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Tone */}
          <Text style={styles.fieldLabel}>Tone</Text>
          <View style={styles.optionRow}>
            {TONES.map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setTone(tone === t ? "" : t)}
                style={[styles.optChip, tone === t && styles.optChipActive]}
                testID={`tone-${t}`}
              >
                <Text style={[styles.optChipText, tone === t && styles.optChipTextActive]}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Output type */}
          <Text style={styles.fieldLabel}>Deliverable</Text>
          <View style={styles.optionRow}>
            {OUTPUT_TYPES.map((o) => (
              <TouchableOpacity
                key={o}
                onPress={() => setOutputType(outputType === o ? "" : o)}
                style={[styles.optChip, outputType === o && styles.optChipActive]}
                testID={`output-${o.replace(/\s/g, "-")}`}
              >
                <Text style={[styles.optChipText, outputType === o && styles.optChipTextActive]}>
                  {o}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Priority */}
          <Text style={styles.fieldLabel}>Priority</Text>
          <View style={styles.optionRow}>
            {PRIORITIES.map((p) => (
              <TouchableOpacity
                key={p.key}
                onPress={() => setPriority(p.key)}
                style={[
                  styles.optChip,
                  priority === p.key && styles.optChipActive,
                  priority === p.key && p.key === "emergency" && { backgroundColor: `${colors.danger}33`, borderColor: colors.danger },
                ]}
                testID={`priority-${p.key}`}
              >
                <Text
                  style={[
                    styles.optChipText,
                    priority === p.key && styles.optChipTextActive,
                    priority === p.key && p.key === "emergency" && { color: colors.danger },
                  ]}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.deployBtn, (!canLaunch || submitting) && { opacity: 0.5 }]}
            onPress={launch}
            disabled={!canLaunch || submitting}
            testID="deploy-custom-mission-btn"
          >
            <LinearGradient
              colors={["#D4AF37", "#9333EA"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="flash" size={18} color="#fff" />
                <Text style={styles.deployText}>Deploy Fusion</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.muted,
  },
  headerTitle: {
    flex: 1, textAlign: "center",
    color: colors.textMain, fontSize: 16, fontWeight: "500",
    letterSpacing: 2, textTransform: "uppercase",
  },
  scroll: { padding: spacing.lg, paddingBottom: 40 },
  overline: { color: colors.secondary, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", fontWeight: "700" },
  title: { color: colors.textMain, fontSize: 32, fontWeight: "300", fontStyle: "italic", marginTop: spacing.sm },
  subtitle: { color: colors.textSubtle, fontSize: 14, marginTop: spacing.sm, lineHeight: 20, maxWidth: 340 },
  fieldLabel: {
    color: colors.textSubtle, fontSize: 11, letterSpacing: 2,
    textTransform: "uppercase", fontWeight: "600",
    marginTop: spacing.lg, marginBottom: 8,
  },
  input: {
    backgroundColor: colors.muted, borderColor: colors.border, borderWidth: 1,
    borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12,
    color: colors.textMain, fontSize: 14,
  },
  textarea: { minHeight: 90, textAlignVertical: "top", paddingTop: 12 },
  agentGrid: { gap: spacing.sm },
  agentChip: {
    flexDirection: "row", alignItems: "center",
    gap: spacing.md, padding: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.border, borderWidth: 1,
    borderRadius: radius.md,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  agentChipName: { color: colors.textMain, fontSize: 15, fontWeight: "600" },
  agentChipRole: { color: colors.textSubtle, fontSize: 11, marginTop: 2 },
  checkPill: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  checkPillText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  optionRow: {
    flexDirection: "row", flexWrap: "wrap", gap: spacing.sm,
  },
  optChip: {
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.muted,
  },
  optChipActive: {
    backgroundColor: `${colors.secondary}22`,
    borderColor: colors.secondary,
  },
  optChipText: {
    color: colors.textSubtle, fontSize: 11,
    fontWeight: "600", letterSpacing: 1, textTransform: "uppercase",
  },
  optChipTextActive: { color: colors.secondary },
  footer: {
    padding: spacing.md, paddingBottom: Platform.OS === "ios" ? spacing.lg : spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  deployBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: spacing.sm, paddingVertical: 16,
    borderRadius: radius.pill, overflow: "hidden",
  },
  deployText: {
    color: "#fff", fontSize: 14, fontWeight: "700",
    letterSpacing: 2, textTransform: "uppercase",
  },
});
