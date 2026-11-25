// From the live page's PALLY:APP:DESIGN-TOKENS block.

export const DESIGN_TOKENS = Object.freeze({
  name: "aide-care",
  colorScheme: "light",
  palette: {
    background: "#f4f1ec",
    surface: "#ffffff",
    text: "#1d2523",
    muted: "#4b5755",
    accent: "#1f5c5a",
    accentAlt: "#174745",
    onAccent: "#ffffff",
    border: "#c9c4bb",
    danger: "#9a2a2a",
  },
  darkMode: {
    background: "#161c1b",
    surface: "#1f2827",
    text: "#f1f0ec",
    muted: "#b9c3c0",
    accent: "#8fd0cb",
    accentAlt: "#a9ded9",
    onAccent: "#10201f",
    border: "#3d4a48",
    danger: "#ffa8a0",
  },
  fonts: {
    body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif',
    display: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif',
    mono: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  },
  radii: { small: "0.5rem", medium: "0.875rem", large: "1.125rem", pill: "999px" },
  spacing: { xs: "0.25rem", sm: "0.5rem", md: "1rem", lg: "1.5rem", xl: "2.5rem" },
  effects: {
    canvas: "linear-gradient(var(--color-bg), var(--color-bg))",
    canvasAttachment: "scroll",
    cardShadow: "0 1px 2px rgb(0 0 0 / 10%)",
    cardBorderWidth: "1px",
  },
});
