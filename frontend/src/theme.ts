// Shared theme tokens for Shennell — Dark Luxury archetype.
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
  success: "#7FB069",
  danger: "#FF4D6D",
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

export const fonts = {
  // Use system fonts that read as elegant on mobile; serif-inspired on iOS.
  heading: undefined as string | undefined, // fall through to default but styled
  body: undefined as string | undefined,
};

export const MEDIA = {
  background: "https://static.prod-images.emergentagent.com/jobs/0f34c0b6-804d-451d-bc02-83ad416c8e01/images/20bf59fcb3a988f617380d5ca7ecfdf85c10e242a1f2a4e43fdf8ce7a1b203e2.png",
  shennell: "https://static.prod-images.emergentagent.com/jobs/0f34c0b6-804d-451d-bc02-83ad416c8e01/images/3ef75f6021e03e01494c6590123b88188f655fcc073baba09d3931390f2ff520.png",
};
