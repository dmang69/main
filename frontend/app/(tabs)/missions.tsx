import React, { useMemo, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius, spacing } from "@/src/theme";

type MissionCategory = {
  key: string;
  label: string;
  colors: [string, string];
  icon: string;
};

type MissionPack = {
  key: string;
  title: string;
  description: string;
  category: string;
  badge: "Popular" | "Advanced" | "Fast" | "Premium";
  outputs: string[];
  eta: string;
};

const CATEGORIES: MissionCategory[] = [
  {
    key: "all",
    label: "All",
    colors: [colors.secondary, colors.primary],
    icon: "grid",
  },
  {
    key: "legal",
    label: "Legal / Lexis",
    colors: ["#9B111E", "#C9CCD3"],
    icon: "briefcase",
  },
  {
    key: "finance",
    label: "Finance / Axiom",
    colors: ["#D4AF37", "#3B7CFF"],
    icon: "cash",
  },
  {
    key: "health",
    label: "Health / Terra",
    colors: ["#2ECC71", "#FFB347"],
    icon: "heart",
  },
  {
    key: "creative",
    label: "Creative / Nova",
    colors: ["#7F3FFF", "#FF4FD8"],
    icon: "color-palette",
  },
  {
    key: "music",
    label: "Music / Suno",
    colors: ["#FF8A34", "#38F2FF"],
    icon: "musical-notes",
  },
  {
    key: "security",
    label: "Security / Cipher",
    colors: ["#7FD9FF", "#2A2F36"],
    icon: "shield-checkmark",
  },
];

const MISSION_PACKS: MissionPack[] = [
  {
    key: "court-case-builder",
    title: "Court Case Builder",
    description: "Draft the full case strategy, filings, and evidence map in one launch.",
    category: "legal",
    badge: "Popular",
    outputs: ["Briefs", "Timeline", "Evidence map"],
    eta: "3 hrs",
  },
  {
    key: "lawsuit-timeline",
    title: "Lawsuit Timeline Generator",
    description: "Turn messy facts into a relentless, court-ready chronology.",
    category: "legal",
    badge: "Fast",
    outputs: ["Timeline", "Exhibit list"],
    eta: "45 min",
  },
  {
    key: "business-launch-kit",
    title: "Business Launch Kit",
    description: "Go from idea to launch-ready brand, legal, and finance stack.",
    category: "finance",
    badge: "Premium",
    outputs: ["Business plan", "Budget", "Go-to-market"],
    eta: "4 hrs",
  },
  {
    key: "grant-funding-pack",
    title: "Grant & Funding Pack",
    description: "Build a grant narrative, budget story, and submission checklist.",
    category: "finance",
    badge: "Advanced",
    outputs: ["Grant draft", "Budget story", "Checklist"],
    eta: "2.5 hrs",
  },
  {
    key: "personal-brand-campaign",
    title: "Personal Brand Campaign",
    description: "Craft persona, social rollout, and signature content pillars.",
    category: "creative",
    badge: "Popular",
    outputs: ["Brand voice", "Content plan", "Launch posts"],
    eta: "2 hrs",
  },
  {
    key: "studio-pack",
    title: "Book / Movie / Song Studio",
    description: "Generate concepts, scripts, and creative briefs in one session.",
    category: "creative",
    badge: "Premium",
    outputs: ["Story bible", "Scene list", "Creative brief"],
    eta: "3.5 hrs",
  },
  {
    key: "crypto-risk-shield",
    title: "Crypto Risk Shield",
    description: "Stress-test assets, contracts, and compliance exposure.",
    category: "security",
    badge: "Advanced",
    outputs: ["Risk report", "Mitigation plan"],
    eta: "2 hrs",
  },
  {
    key: "fda-reform",
    title: "FDA / Health Reform Campaign",
    description: "Plan the policy push with stakeholder mapping and messaging.",
    category: "health",
    badge: "Premium",
    outputs: ["Policy brief", "Advocacy plan", "Press kit"],
    eta: "4 hrs",
  },
  {
    key: "emergency-legal-response",
    title: "Emergency Legal Response",
    description: "Rapid-response filings, statements, and containment actions.",
    category: "legal",
    badge: "Fast",
    outputs: ["Emergency motion", "Response notes"],
    eta: "30 min",
  },
  {
    key: "social-media-blitz",
    title: "Social Media Blitz",
    description: "Launch a high-impact social rollout with ready-made assets.",
    category: "creative",
    badge: "Fast",
    outputs: ["Post kit", "Hashtag map", "CTA copy"],
    eta: "1 hr",
  },
  {
    key: "investor-pitch-pack",
    title: "Investor Pitch Pack",
    description: "Investor story, deck outline, and key financial drivers.",
    category: "finance",
    badge: "Popular",
    outputs: ["Pitch deck", "Metrics story", "Follow-up email"],
    eta: "2.5 hrs",
  },
  {
    key: "document-analyzer",
    title: "Document Analyzer Mission",
    description: "Summarize contracts, flag risk, and produce action steps.",
    category: "security",
    badge: "Advanced",
    outputs: ["Summary", "Risk flags", "Action plan"],
    eta: "1.5 hrs",
  },
];

const BADGE_STYLES: Record<MissionPack["badge"], { bg: string; border: string; text: string }> = {
  Popular: {
    bg: "rgba(212, 175, 55, 0.18)",
    border: "rgba(212, 175, 55, 0.5)",
    text: "#F4D88A",
  },
  Advanced: {
    bg: "rgba(127, 63, 255, 0.18)",
    border: "rgba(127, 63, 255, 0.45)",
    text: "#C7B3FF",
  },
  Fast: {
    bg: "rgba(56, 242, 255, 0.18)",
    border: "rgba(56, 242, 255, 0.5)",
    text: "#9EF8FF",
  },
  Premium: {
    bg: "rgba(255, 79, 216, 0.2)",
    border: "rgba(255, 79, 216, 0.5)",
    text: "#FFC1F0",
  },
};

export default function MissionsTab() {
  const [activeCategory, setActiveCategory] = useState("all");

  const visibleMissions = useMemo(() => {
    if (activeCategory === "all") return MISSION_PACKS;
    return MISSION_PACKS.filter((mission) => mission.category === activeCategory);
  }, [activeCategory]);

  const handleMissionPress = (mission: MissionPack) => {
    Alert.alert(
      "Mission locked",
      `${mission.title} is ready. Launch it or customize the output cadence.`,
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.overline}>Mission Control</Text>
          <Text style={styles.title}>Choose Your Mission</Text>
          <Text style={styles.subtitle}>
            Load a mission pack or forge your own. Every pack deploys with agents,
            timeline, and output vault ready.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.createButton}
          activeOpacity={0.85}
          onPress={() => Alert.alert("Mission Builder", "Custom missions are ready to build.")}
          testID="create-custom-mission-button"
        >
          <LinearGradient
            colors={["#D4AF37", "#AA8000"]}
            style={styles.createGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Ionicons name="add-circle" size={24} color="#0C0C10" />
          <View style={styles.createText}>
            <Text style={styles.createTitle}>Create Custom Mission</Text>
            <Text style={styles.createSubtitle}>
              Goal · tone · agents · output · deadline · priority
            </Text>
          </View>
        </TouchableOpacity>

        <SectionHeader title="Mission Categories" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {CATEGORIES.map((category) => (
            <CategoryChip
              key={category.key}
              category={category}
              active={activeCategory === category.key}
              onPress={() => setActiveCategory(category.key)}
            />
          ))}
        </ScrollView>

        <SectionHeader title="Mission Packs" />
        <View style={styles.cardGrid}>
          {visibleMissions.map((mission) => (
            <MissionCard
              key={mission.key}
              mission={mission}
              category={CATEGORIES.find((category) => category.key === mission.category)}
              onPress={() => handleMissionPress(mission)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <LinearGradient
        colors={["rgba(212,175,55,0.65)", "rgba(155,17,30,0)"]}
        style={styles.sectionDivider}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      />
    </View>
  );
}

function CategoryChip({
  category,
  active,
  onPress,
}: {
  category: MissionCategory;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.filterChip,
        { borderColor: active ? category.colors[0] : colors.border },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
      testID={`missions-filter-${category.key}`}
    >
      {active && (
        <LinearGradient
          colors={[`${category.colors[0]}33`, `${category.colors[1]}33`]}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View
        style={[
          styles.filterIcon,
          {
            borderColor: `${category.colors[0]}66`,
            backgroundColor: `${category.colors[0]}22`,
          },
        ]}
      >
        <Ionicons name={category.icon as never} size={16} color={category.colors[0]} />
      </View>
      <Text style={[styles.filterText, active && styles.filterTextActive]}>
        {category.label}
      </Text>
    </TouchableOpacity>
  );
}

function MissionCard({
  mission,
  category,
  onPress,
}: {
  mission: MissionPack;
  category?: MissionCategory;
  onPress: () => void;
}) {
  const accent = category?.colors[0] ?? colors.secondary;
  const halo = category?.colors[1] ?? colors.primary;
  const badgeStyle = BADGE_STYLES[mission.badge];

  return (
    <TouchableOpacity
      style={[styles.card, { borderColor: `${accent}55` }]}
      activeOpacity={0.85}
      onPress={onPress}
      testID={`mission-card-${mission.key}`}
    >
      <LinearGradient
        colors={[`${accent}28`, `${halo}1A`, "transparent"]}
        style={styles.cardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={styles.cardHeader}>
        <View style={[styles.cardIconWrap, { borderColor: `${accent}AA` }]}>
          <Ionicons name={category?.icon as never} size={18} color={accent} />
        </View>
        <View
          style={[
            styles.badge,
            { backgroundColor: badgeStyle.bg, borderColor: badgeStyle.border },
          ]}
        >
          <Text style={[styles.badgeText, { color: badgeStyle.text }]}>
            {mission.badge}
          </Text>
        </View>
      </View>
      <Text style={styles.cardTitle}>{mission.title}</Text>
      <Text style={styles.cardDescription}>{mission.description}</Text>
      <View style={styles.tagRow}>
        {mission.outputs.map((output) => (
          <View key={output} style={styles.tag}>
            <Text style={styles.tagText}>{output}</Text>
          </View>
        ))}
      </View>
      <View style={styles.cardFooter}>
        <StatusChip label="Ready" color={accent} />
        <View style={styles.etaRow}>
          <Ionicons name="time-outline" size={14} color={colors.textFaint} />
          <Text style={styles.etaText}>ETA {mission.eta}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function StatusChip({ label, color }: { label: string; color: string }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] });

  return (
    <View style={styles.statusChip}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Animated.View
        style={[
          styles.statusPulse,
          { borderColor: color, transform: [{ scale }], opacity },
        ]}
      />
      <Text style={styles.statusText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: 140 },
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
    fontSize: 36,
    fontWeight: "300",
    letterSpacing: -0.4,
    fontStyle: "italic",
  },
  subtitle: {
    color: colors.textSubtle,
    fontSize: 14,
    marginTop: spacing.sm,
    lineHeight: 20,
    maxWidth: 320,
  },
  createButton: {
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    overflow: "hidden",
    marginBottom: spacing.xl,
    shadowColor: "#D4AF37",
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  createGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg,
  },
  createText: { flex: 1 },
  createTitle: {
    color: "#0C0C10",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  createSubtitle: {
    color: "#1F1300",
    fontSize: 11,
    marginTop: 4,
    letterSpacing: 0.8,
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.textMain,
    fontSize: 18,
    fontWeight: "500",
    marginBottom: spacing.sm,
  },
  sectionDivider: {
    height: 2,
    borderRadius: 999,
  },
  filterRow: {
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  filterIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  filterText: {
    color: colors.textSubtle,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  filterTextActive: {
    color: colors.textMain,
    fontWeight: "600",
  },
  cardGrid: {
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  cardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  cardTitle: {
    color: colors.textMain,
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  cardDescription: {
    color: colors.textSubtle,
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  tag: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  tagText: {
    color: colors.textFaint,
    fontSize: 11,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.lg,
  },
  etaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  etaText: {
    color: colors.textFaint,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusPulse: {
    position: "absolute",
    left: 10,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusText: {
    color: colors.textMain,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    fontWeight: "600",
  },
});
