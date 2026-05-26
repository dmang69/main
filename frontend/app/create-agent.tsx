import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius, spacing } from "@/src/theme";
import { AgentTemplate, apiGet, apiPost, getUserId } from "@/src/api";

export default function CreateAgent() {
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AgentTemplate | null>(null);
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customRole, setCustomRole] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiGet<AgentTemplate[]>("/templates");
      setTemplates(data);
    } catch (e) {
      console.warn("load templates failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const deploy = async () => {
    if (submitting) return;
    const uid = await getUserId();
    setSubmitting(true);
    try {
      if (customMode) {
        if (!customName.trim() || !customRole.trim()) {
          Alert.alert("Incomplete", "Give your agent a name and a role.");
          setSubmitting(false);
          return;
        }
        await apiPost("/agents", {
          user_id: uid,
          name: customName.trim(),
          role: customRole.trim(),
          system_prompt: customPrompt.trim() || undefined,
        });
      } else if (selected) {
        await apiPost("/agents", {
          user_id: uid,
          name: selected.name,
          role: selected.role,
          template_key: selected.key,
        });
      } else {
        Alert.alert("Pick one", "Choose a template or build a custom agent.");
        setSubmitting(false);
        return;
      }
      router.back();
    } catch (e: any) {
      const msg = e?.message || "Failed to create agent";
      Alert.alert("Couldn't deploy", msg.includes("Max 5") ? "You already have 5 agents. Dismiss one first." : msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.iconBtn}
          testID="create-agent-close-btn"
        >
          <Ionicons name="close" size={22} color={colors.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Deploy Agent</Text>
        <View style={styles.iconBtn} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.overline}>Choose your operative</Text>
          <Text style={styles.title}>Build the squad</Text>
          <Text style={styles.subtitle}>
            Hand-pick a specialist or design your own. Each agent runs in their own session, sharp and focused.
          </Text>

          {/* Mode toggle */}
          <View style={styles.toggle}>
            <TouchableOpacity
              onPress={() => setCustomMode(false)}
              style={[styles.toggleBtn, !customMode && styles.toggleBtnActive]}
              testID="mode-template-btn"
            >
              <Text style={[styles.toggleText, !customMode && styles.toggleTextActive]}>
                Templates
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setCustomMode(true)}
              style={[styles.toggleBtn, customMode && styles.toggleBtnActive]}
              testID="mode-custom-btn"
            >
              <Text style={[styles.toggleText, customMode && styles.toggleTextActive]}>
                Custom
              </Text>
            </TouchableOpacity>
          </View>

          {customMode ? (
            <View style={styles.customForm}>
              <Text style={styles.fieldLabel}>Agent name</Text>
              <TextInput
                value={customName}
                onChangeText={setCustomName}
                placeholder="e.g. Mercury"
                placeholderTextColor={colors.textFaint}
                style={styles.input}
                testID="custom-name-input"
              />
              <Text style={styles.fieldLabel}>Role / specialty</Text>
              <TextInput
                value={customRole}
                onChangeText={setCustomRole}
                placeholder="e.g. Real Estate Underwriter"
                placeholderTextColor={colors.textFaint}
                style={styles.input}
                testID="custom-role-input"
              />
              <Text style={styles.fieldLabel}>System instructions (optional)</Text>
              <TextInput
                value={customPrompt}
                onChangeText={setCustomPrompt}
                placeholder="Tone, expertise, do's and don'ts…"
                placeholderTextColor={colors.textFaint}
                style={[styles.input, styles.textarea]}
                multiline
                testID="custom-prompt-input"
              />
            </View>
          ) : loading ? (
            <ActivityIndicator color={colors.secondary} style={{ marginTop: spacing.xl }} />
          ) : (
            <View style={styles.templateList}>
              {templates.map((t) => {
                const isSelected = selected?.key === t.key;
                return (
                  <TouchableOpacity
                    key={t.key}
                    onPress={() => setSelected(t)}
                    style={[
                      styles.templateCard,
                      isSelected && {
                        borderColor: t.color,
                        shadowColor: t.color,
                      },
                    ]}
                    activeOpacity={0.85}
                    testID={`template-${t.key}`}
                  >
                    <LinearGradient
                      colors={[`${t.color}22`, "transparent"]}
                      style={StyleSheet.absoluteFill}
                    />
                    <Image source={{ uri: t.avatar_url }} style={styles.tplAvatar} />
                    <View style={styles.tplInfo}>
                      <Text style={styles.tplName}>{t.name}</Text>
                      <Text style={styles.tplRole}>{t.role}</Text>
                      <Text style={styles.tplTagline}>{t.tagline}</Text>
                      {t.can_generate_images ? (
                        <View style={styles.imgBadge}>
                          <Ionicons name="image" size={11} color={colors.secondary} />
                          <Text style={styles.imgBadgeText}>image gen</Text>
                        </View>
                      ) : null}
                    </View>
                    <View
                      style={[
                        styles.radio,
                        isSelected && {
                          backgroundColor: t.color,
                          borderColor: t.color,
                        },
                      ]}
                    >
                      {isSelected ? (
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.deployBtn,
              ((!customMode && !selected) ||
                (customMode && (!customName || !customRole)) ||
                submitting) && { opacity: 0.5 },
            ]}
            onPress={deploy}
            disabled={
              submitting ||
              (!customMode && !selected) ||
              (customMode && (!customName.trim() || !customRole.trim()))
            }
            testID="deploy-agent-btn"
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={StyleSheet.absoluteFill}
            />
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="flash" size={18} color="#fff" />
                <Text style={styles.deployText}>Deploy Agent</Text>
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
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.muted,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: colors.textMain,
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  scroll: { padding: spacing.lg, paddingBottom: 40 },
  overline: {
    color: colors.secondary,
    fontSize: 11,
    letterSpacing: 3,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  title: {
    color: colors.textMain,
    fontSize: 34,
    fontWeight: "300",
    fontStyle: "italic",
    marginTop: spacing.sm,
  },
  subtitle: {
    color: colors.textSubtle,
    fontSize: 14,
    marginTop: spacing.sm,
    lineHeight: 20,
    maxWidth: 340,
  },
  toggle: {
    flexDirection: "row",
    backgroundColor: colors.muted,
    borderRadius: radius.pill,
    padding: 4,
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: radius.pill,
  },
  toggleBtnActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    color: colors.textSubtle,
    fontSize: 12,
    letterSpacing: 1.5,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  toggleTextActive: {
    color: "#fff",
  },
  templateList: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  templateCard: {
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
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  tplAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.muted,
  },
  tplInfo: { flex: 1 },
  tplName: {
    color: colors.textMain,
    fontSize: 18,
    fontWeight: "500",
    fontStyle: "italic",
    letterSpacing: 0.3,
  },
  tplRole: {
    color: colors.textSubtle,
    fontSize: 12,
    marginTop: 2,
  },
  tplTagline: {
    color: colors.textFaint,
    fontSize: 11,
    marginTop: 4,
    fontStyle: "italic",
  },
  imgBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(212,175,55,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  imgBadgeText: {
    color: colors.secondary,
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: "700",
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  customForm: {
    marginTop: spacing.lg,
  },
  fieldLabel: {
    color: colors.textSubtle,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontWeight: "600",
    marginBottom: 6,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.muted,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    color: colors.textMain,
    fontSize: 15,
  },
  textarea: {
    minHeight: 110,
    textAlignVertical: "top",
    paddingTop: 14,
  },
  footer: {
    padding: spacing.md,
    paddingBottom: Platform.OS === "ios" ? spacing.lg : spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  deployBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: 16,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  deployText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
});
