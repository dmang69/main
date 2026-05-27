// Shennell theme — vibrant per-category palettes + glows.
export const colors = {
  background: "#030305",
  surface: "#0C0C10",
  surfaceAlt: "#14141A",
  surfaceGlass: "rgba(12, 12, 16, 0.78)",
  primary: "#9B111E",
  primaryGlow: "rgba(155, 17, 30, 0.45)",
  primaryDark: "#6B0B14",
  secondary: "#D4AF37",
  secondaryDark: "#AA8000",
  muted: "#1A1A24",
  mutedFg: "#8E8E93",
  border: "rgba(255, 255, 255, 0.08)",
  borderStrong: "rgba(255, 255, 255, 0.16)",
  textMain: "#F5F5F7",
  textSubtle: "#A1A1AA",
  textFaint: "#6B6B73",
  success: "#10B981",
  danger: "#FF4D6D",
  warning: "#F59E0B",
};

// Each agent gets a dual-color identity: main + accent + glow + gradient stops.
export const agentPalette: Record<string, AgentColors> = {
  lexis:  { main: "#E63946", accent: "#C9CCD3", glow: "rgba(230,57,70,0.45)",  grad: ["#E63946", "#7A0D17"] },  // crimson + silver
  axiom:  { main: "#D4AF37", accent: "#1FB6FF", glow: "rgba(212,175,55,0.45)", grad: ["#D4AF37", "#7A6520"] },  // gold + electric blue
  terra:  { main: "#10B981", accent: "#F59E0B", glow: "rgba(16,185,129,0.45)", grad: ["#10B981", "#055944"] },  // emerald + amber
  nova:   { main: "#9333EA", accent: "#FF2D9F", glow: "rgba(147,51,234,0.5)",  grad: ["#9333EA", "#FF2D9F"] },  // violet + neon pink
  suno:   { main: "#FF8C42", accent: "#06D6FF", glow: "rgba(255,140,66,0.5)",  grad: ["#FF8C42", "#B05016"] },  // orange + cyan
  cipher: { main: "#7CC4FF", accent: "#3B3F4A", glow: "rgba(124,196,255,0.4)", grad: ["#7CC4FF", "#2C3340"] },  // ice blue + gunmetal
};

export type AgentColors = {
  main: string;
  accent: string;
  glow: string;
  grad: [string, string];
};

export const categoryPalette: Record<string, AgentColors> = {
  legal:    agentPalette.lexis,
  finance:  agentPalette.axiom,
  health:   agentPalette.terra,
  creative: agentPalette.nova,
  music:    agentPalette.suno,
  security: agentPalette.cipher,
  crossover:{ main: "#D4AF37", accent: "#9333EA", glow: "rgba(212,175,55,0.4)", grad: ["#D4AF37", "#9333EA"] },
};

export const badgeStyle: Record<string, { bg: string; fg: string; label: string }> = {
  popular:   { bg: "#FF2D9F22", fg: "#FF2D9F", label: "POPULAR" },
  premium:   { bg: "#D4AF3722", fg: "#D4AF37", label: "PREMIUM" },
  advanced:  { bg: "#9333EA22", fg: "#9333EA", label: "ADVANCED" },
  fast:      { bg: "#10B98122", fg: "#10B981", label: "FAST" },
  emergency: { bg: "#FF4D6D33", fg: "#FF4D6D", label: "EMERGENCY" },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
};

export const MEDIA = {
  background: "https://static.prod-images.emergentagent.com/jobs/0f34c0b6-804d-451d-bc02-83ad416c8e01/images/20bf59fcb3a988f617380d5ca7ecfdf85c10e242a1f2a4e43fdf8ce7a1b203e2.png",
  shennell: "https://static.prod-images.emergentagent.com/jobs/0f34c0b6-804d-451d-bc02-83ad416c8e01/images/3ef75f6021e03e01494c6590123b88188f655fcc073baba09d3931390f2ff520.png",
};
