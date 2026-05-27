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
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius, spacing, MEDIA } from "@/src/theme";
import { apiDelete, clearSession, getUserId } from "@/src/api";
import { storage } from "@/src/utils/storage";

const TIERS = [
  {
    key: "essential",
    name: "Essential",
    price: "Free",
    blurb: "Shennell + 2 active agents",
    features: ["Shennell main chat", "Up to 2 mini-agents", "Standard model"],
    current: true,
  },
  {
    key: "elite",
    name: "Elite",
    price: "$19/mo",
    blurb: "The full squad of 5",
    features: ["All 5 agent slots", "Image generation unlocked", "Priority model access", "Conversation export"],
  },
  {
    key: "empire",
    name: "Empire",
    price: "$49/mo",
    blurb: "Power-user tier",
    features: ["Everything in Elite", "Custom system prompts", "Long-form (3hr) media briefs", "Early features", "Priority support"],
  },
] as const;

export default function ProfileTab() {
  const [userId, setUserId] = useState("");
  const [tier] = useState("essential");

  useFocusEffect(
    useCallback(() => {
      (async () => setUserId(await getUserId()))();
    }, []),
  );

  const onReset = () => {
    Alert.alert(
      "Reset everything?",
      "This wipes your squad, all conversations, and your local profile. Cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              // Best-effort clear server-side data
              await apiDelete(
                `/shennell/messages?user_id=${encodeURIComponent(userId)}`,
              );
            } catch (e) {
              console.warn("clear failed", e);
            }
            await clearSession();
            await storage.removeItem("shennell_user_id");
            const newId = await getUserId();
            setUserId(newId);
            Alert.alert("Done", "Fresh slate. New profile created.");
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.heroWrap}>
          <LinearGradient
            colors={["rgba(155,17,30,0.3)", "transparent"]}
            style={StyleSheet.absoluteFill}
          />
          <Image source={{ uri: MEDIA.shennell }} style={styles.heroAvatar} />
          <Text style={styles.overline}>Profile & Tiers</Text>
          <Text style={styles.heroName}>Welcome back</Text>
          <Text style={styles.heroSub} numberOfLines={1} testID="profile-user-id">
            ID · {userId.slice(0, 16)}
          </Text>
        </View>

        {/* Current tier */}
        <View style={styles.currentTier}>
          <View>
            <Text style={styles.sectionLabel}>Current Tier</Text>
            <Text style={styles.currentTierName}>Essential</Text>
          </View>
          <View style={styles.tierBadge}>
            <Text style={styles.tierBadgeText}>FREE</Text>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { marginTop: spacing.xl }]}>
          Unlock the Empire
        </Text>

        {TIERS.map((t) => (
          <View
            key={t.key}
            style={[
              styles.tierCard,
              t.key === "elite" && styles.tierCardElite,
              t.key === "empire" && styles.tierCardEmpire,
            ]}
            testID={`tier-${t.key}`}
          >
            {t.key === "elite" ? (
              <View style={styles.popularPill}>
                <Text style={styles.popularPillText}>MOST POWERFUL</Text>
              </View>
            ) : null}
            <View style={styles.tierHeader}>
              <Text style={styles.tierName}>{t.name}</Text>
              <Text style={styles.tierPrice}>{t.price}</Text>
            </View>
            <Text style={styles.tierBlurb}>{t.blurb}</Text>
            <View style={styles.featureList}>
              {t.features.map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <Ionicons
                    name="checkmark"
                    size={16}
                    color={t.key === "empire" ? colors.secondary : colors.primary}
                  />
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>

            {t.key !== "essential" ? (
              <TouchableOpacity
                style={[
                  styles.upgradeBtn,
                  t.key === "empire" && styles.upgradeBtnGold,
                ]}
                onPress={() =>
                  Alert.alert(
                    "Coming soon",
                    "Payments launch shortly. You're on the early list.",
                  )
                }
                testID={`upgrade-${t.key}-btn`}
              >
                <Text
                  style={[
                    styles.upgradeBtnText,
                    t.key === "empire" && { color: "#000" },
                  ]}
                >
                  {t.key === "empire" ? "Reserve Empire" : "Upgrade"}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.currentChip}>
                <Text style={styles.currentChipText}>Your current tier</Text>
              </View>
            )}
          </View>
        ))}

        <View style={styles.dangerZone}>
          <Text style={styles.sectionLabel}>Account</Text>
          <TouchableOpacity
            style={styles.dangerBtn}
            onPress={onReset}
            testID="reset-profile-btn"
          >
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Text style={styles.dangerBtnText}>Reset profile & data</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>Shennell · Built to make you unstoppable</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: 140 },
  heroWrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  heroAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: colors.secondary,
    marginBottom: spacing.md,
  },
  overline: {
    color: colors.secondary,
    fontSize: 11,
    letterSpacing: 3,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  heroName: {
    color: colors.textMain,
    fontSize: 28,
    fontWeight: "300",
    letterSpacing: -0.5,
    fontStyle: "italic",
    marginTop: spacing.sm,
  },
  heroSub: {
    color: colors.textSubtle,
    fontSize: 12,
    letterSpacing: 1.5,
    marginTop: 4,
  },
  currentTier: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    borderColor: colors.border,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionLabel: {
    color: colors.textSubtle,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  currentTierName: {
    color: colors.textMain,
    fontSize: 20,
    fontWeight: "500",
  },
  tierBadge: {
    backgroundColor: colors.muted,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderColor: colors.border,
    borderWidth: 1,
  },
  tierBadgeText: {
    color: colors.textMain,
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: "700",
  },
  tierCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
    position: "relative",
  },
  tierCardElite: {
    borderColor: colors.primary,
  },
  tierCardEmpire: {
    borderColor: colors.secondary,
  },
  popularPill: {
    position: "absolute",
    top: -10,
    right: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  popularPillText: {
    color: "#fff",
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "700",
  },
  tierHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  tierName: {
    color: colors.textMain,
    fontSize: 22,
    fontWeight: "500",
    fontStyle: "italic",
    letterSpacing: 0.3,
  },
  tierPrice: {
    color: colors.secondary,
    fontSize: 18,
    fontWeight: "600",
  },
  tierBlurb: {
    color: colors.textSubtle,
    fontSize: 13,
    marginTop: 4,
  },
  featureList: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  featureText: {
    color: colors.textMain,
    fontSize: 14,
    flex: 1,
  },
  upgradeBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.pill,
    alignItems: "center",
  },
  upgradeBtnGold: {
    backgroundColor: colors.secondary,
  },
  upgradeBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  currentChip: {
    marginTop: spacing.md,
    alignSelf: "flex-start",
    backgroundColor: colors.muted,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  currentChipText: {
    color: colors.textSubtle,
    fontSize: 12,
    fontStyle: "italic",
  },
  dangerZone: {
    marginTop: spacing.xl,
  },
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    borderColor: "rgba(255,77,109,0.3)",
    borderWidth: 1,
  },
  dangerBtnText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "500",
  },
  footer: {
    color: colors.textFaint,
    fontSize: 11,
    letterSpacing: 2,
    textAlign: "center",
    marginTop: spacing.xl,
    textTransform: "uppercase",
  },
});
