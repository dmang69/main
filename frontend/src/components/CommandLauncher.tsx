import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { agentPalette, colors, radius, spacing } from "@/src/theme";

type Mode = {
  key: string;
  label: string;
  icon: string;
  grad: [string, string];
  description: string;
  onPress: () => void;
};

type SlashCmd = {
  cmd: string;
  description: string;
  onPress: () => void;
};

export default function CommandLauncher() {
  const [open, setOpen] = useState(false);

  const modes: Mode[] = [
    {
      key: "direct",
      label: "Direct",
      icon: "chatbubbles",
      grad: ["#9B111E", "#6B0B14"],
      description: "1:1 with a specialist",
      onPress: () => router.push("/(tabs)/agents"),
    },
    {
      key: "squad",
      label: "Squad",
      icon: "people-circle",
      grad: ["#D4AF37", "#AA8000"],
      description: "Your 5-agent ecosystem",
      onPress: () => router.push("/(tabs)/agents"),
    },
    {
      key: "mission",
      label: "Mission",
      icon: "flash",
      grad: ["#9333EA", "#7A24CC"],
      description: "Multi-step orchestration",
      onPress: () => router.push("/(tabs)/missions"),
    },
    {
      key: "battle",
      label: "Battle",
      icon: "flash-off",
      grad: ["#FF2D9F", "#9333EA"],
      description: "Compare agents head-to-head",
      onPress: () => router.push("/battle"),
    },
    {
      key: "fusion",
      label: "Fusion",
      icon: "git-merge",
      grad: ["#10B981", "#1FB6FF"],
      description: "Forge custom multi-agent missions",
      onPress: () => router.push("/create-mission"),
    },
    {
      key: "vault",
      label: "Vault",
      icon: "archive",
      grad: ["#1FB6FF", "#2C3340"],
      description: "Archived mission outputs",
      onPress: () => router.push("/(tabs)/vault"),
    },
  ];

  const slashCommands: SlashCmd[] = [
    { cmd: "/deploy lexis", description: "Spawn LEXIS legal agent",  onPress: () => router.push("/create-agent") },
    { cmd: "/deploy axiom", description: "Spawn AXIOM finance agent", onPress: () => router.push("/create-agent") },
    { cmd: "/deploy nova", description: "Spawn NOVA creative agent",  onPress: () => router.push("/create-agent") },
    { cmd: "/mission crypto_audit", description: "Run Crypto Portfolio Audit", onPress: () => router.push("/(tabs)/missions") },
    { cmd: "/mission hollywood_3hr", description: "Launch full feature film blueprint", onPress: () => router.push("/(tabs)/missions") },
    { cmd: "/mission emergency_legal", description: "Emergency legal response", onPress: () => router.push("/(tabs)/missions") },
    { cmd: "/build motion", description: "Court Case Builder mission", onPress: () => router.push("/(tabs)/missions") },
    { cmd: "/analyze filing", description: "Document Analyzer mission", onPress: () => router.push("/(tabs)/missions") },
    { cmd: "/compare agents", description: "Battle Mode comparison",   onPress: () => router.push("/battle") },
    { cmd: "/timeline case", description: "Lawsuit Timeline Generator",onPress: () => router.push("/(tabs)/missions") },
    { cmd: "/create documentary", description: "Hollywood Production",  onPress: () => router.push("/(tabs)/missions") },
    { cmd: "/forge custom", description: "Custom Agent Fusion mission", onPress: () => router.push("/create-mission") },
  ];

  return (
    <>
      <TouchableOpacity
        style={styles.launcher}
        onPress={() => setOpen(true)}
        activeOpacity={0.85}
        testID="command-launcher-btn"
      >
        <LinearGradient
          colors={["#D4AF37", "#9333EA"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.launcherInner}>
          <Ionicons name="terminal" size={18} color="#fff" />
          <Text style={styles.launcherText}>Command</Text>
          <View style={styles.kbd}>
            <Text style={styles.kbdText}>/</Text>
          </View>
        </View>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.palette} onPress={(e) => e.stopPropagation()}>
            <View style={styles.paletteHeader}>
              <Text style={styles.paletteOverline}>Command Center</Text>
              <TouchableOpacity onPress={() => setOpen(false)} style={styles.closeBtn} testID="command-close">
                <Ionicons name="close" size={18} color={colors.textMain} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 560 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionLabel}>Modes</Text>
              <View style={styles.modeGrid}>
                {modes.map((m) => (
                  <TouchableOpacity
                    key={m.key}
                    style={styles.modeCard}
                    activeOpacity={0.85}
                    onPress={() => { setOpen(false); m.onPress(); }}
                    testID={`mode-${m.key}`}
                  >
                    <LinearGradient colors={m.grad} style={styles.modeIcon}>
                      <Ionicons name={m.icon as any} size={20} color="#fff" />
                    </LinearGradient>
                    <Text style={styles.modeLabel}>{m.label}</Text>
                    <Text style={styles.modeDesc}>{m.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>Slash Commands</Text>
              {slashCommands.map((s) => (
                <TouchableOpacity
                  key={s.cmd}
                  style={styles.cmdRow}
                  onPress={() => { setOpen(false); s.onPress(); }}
                  testID={`slash-${s.cmd.replace(/[/ ]/g, "")}`}
                >
                  <Text style={styles.cmdCode}>{s.cmd}</Text>
                  <Text style={styles.cmdDesc}>{s.description}</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.textSubtle} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  launcher: {
    margin: spacing.md,
    marginTop: 0,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  launcherInner: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: 12,
  },
  launcherText: { color: "#fff", fontSize: 13, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase", flex: 1 },
  kbd: {
    width: 24, height: 24, borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center", justifyContent: "center",
  },
  kbdText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", padding: spacing.md },
  palette: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.borderStrong,
    overflow: "hidden",
    maxWidth: 480, width: "100%", alignSelf: "center",
  },
  paletteHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  paletteOverline: { color: colors.secondary, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", fontWeight: "700" },
  closeBtn: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: colors.muted },
  sectionLabel: { color: colors.textSubtle, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", fontWeight: "700", paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  modeGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, paddingHorizontal: spacing.md },
  modeCard: {
    width: "47%",
    backgroundColor: colors.muted,
    borderColor: colors.border, borderWidth: 1,
    borderRadius: radius.md, padding: spacing.md,
  },
  modeIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  modeLabel: { color: colors.textMain, fontSize: 15, fontWeight: "700", letterSpacing: 0.5 },
  modeDesc: { color: colors.textSubtle, fontSize: 11, marginTop: 2 },
  cmdRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  cmdCode: { color: colors.secondary, fontSize: 13, fontWeight: "700", fontFamily: "Menlo" as any, minWidth: 140 },
  cmdDesc: { color: colors.textSubtle, fontSize: 12, flex: 1 },
});
