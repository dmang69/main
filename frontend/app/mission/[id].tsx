import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/src/theme";
import { apiGet } from "@/src/api";

type Step = {
  step_index: number;
  agent_key: string;
  agent_name: string;
  title: string;
  output: string;
  status: string;
};

type Mission = {
  id: string;
  preset_name: string;
  objective: string;
  status: string;
  steps: Step[];
  created_at: string;
  completed_at?: string;
};

export default function MissionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      const data = await apiGet<Mission>(`/missions/${id}`);
      setMission(data);
    } catch (e) {
      console.warn("load mission failed", e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Poll while mission is running
  useEffect(() => {
    if (!mission || mission.status === "complete" || mission.status === "failed") return;
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, [mission, refresh]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.iconBtn}
          testID="mission-back-btn"
        >
          <Ionicons name="chevron-back" size={22} color={colors.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {mission?.preset_name || "Mission"}
        </Text>
        <View style={[styles.iconBtn, {
          backgroundColor: mission?.status === "complete" ? `${colors.success}33` :
            mission?.status === "failed" ? `${colors.danger}33` :
            `${colors.secondary}33`,
        }]}>
          {mission?.status === "running" ? (
            <ActivityIndicator color={colors.secondary} size="small" />
          ) : (
            <Ionicons
              name={mission?.status === "complete" ? "checkmark" : mission?.status === "failed" ? "close" : "ellipsis-horizontal"}
              size={16}
              color={
                mission?.status === "complete" ? colors.success :
                mission?.status === "failed" ? colors.danger :
                colors.secondary
              }
            />
          )}
        </View>
      </View>

      {loading || !mission ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.secondary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {mission.objective ? (
            <View style={styles.objectiveBox}>
              <Text style={styles.objectiveLabel}>OBJECTIVE</Text>
              <Text style={styles.objectiveText}>{mission.objective}</Text>
            </View>
          ) : null}

          {mission.steps.map((step) => (
            <View key={step.step_index} style={styles.stepCard} testID={`mission-step-${step.step_index}`}>
              <View style={styles.stepHeader}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{step.step_index + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepAgent}>{step.agent_name} · {step.agent_key.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.stepOutput}>{step.output}</Text>
            </View>
          ))}

          {mission.status === "running" ? (
            <View style={styles.runningCard}>
              <ActivityIndicator color={colors.secondary} />
              <Text style={styles.runningText}>
                {mission.steps.length === 0
                  ? "Mission starting..."
                  : `Step ${mission.steps.length} complete. Working on next…`}
              </Text>
            </View>
          ) : null}

          {mission.status === "complete" ? (
            <View style={styles.doneCard}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={styles.doneText}>Mission complete</Text>
            </View>
          ) : null}

          {mission.status === "failed" ? (
            <View style={styles.failedCard}>
              <Ionicons name="alert-circle" size={20} color={colors.danger} />
              <Text style={styles.failedText}>Mission failed — try again or contact Shennell.</Text>
            </View>
          ) : null}

          <View style={{ height: 60 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.md,
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
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: spacing.lg, paddingBottom: 80 },
  objectiveBox: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  objectiveLabel: {
    color: colors.secondary,
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: "700",
    marginBottom: 4,
  },
  objectiveText: { color: colors.textMain, fontSize: 14, fontStyle: "italic", lineHeight: 20 },
  stepCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  stepHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  stepNumber: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center",
  },
  stepNumberText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  stepTitle: { color: colors.textMain, fontSize: 15, fontWeight: "500" },
  stepAgent: {
    color: colors.secondary,
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "700",
    marginTop: 2,
  },
  stepOutput: {
    color: colors.textMain,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  } as any,
  runningCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.secondary,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  runningText: { color: colors.textMain, fontSize: 13, fontStyle: "italic", flex: 1 },
  doneCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: `${colors.success}22`,
    borderColor: colors.success,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  doneText: { color: colors.success, fontSize: 14, fontWeight: "600" },
  failedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: `${colors.danger}22`,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  failedText: { color: colors.danger, fontSize: 13, flex: 1 },
});
