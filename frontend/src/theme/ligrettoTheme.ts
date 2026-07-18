// A clean, playful Ligretto theme used as the fallback when the project ships no branding.
// Colours nod to the four Ligretto decks (red / blue / green / yellow). When branding IS
// present, BrandingThemeProvider prefers themeFromBranding(branding) instead.
import { createTheme } from "@mui/material";

// The Ligretto deck palette — handy for per-player / per-deck accents in the UI.
export const LIGRETTO_COLORS = {
  red: "#e5352b",
  blue: "#1e73d1",
  green: "#2fa84f",
  yellow: "#f4b400",
} as const;

export const ligrettoTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: LIGRETTO_COLORS.red },
    secondary: { main: LIGRETTO_COLORS.blue },
    success: { main: LIGRETTO_COLORS.green },
    warning: { main: LIGRETTO_COLORS.yellow },
    background: { default: "#f6f7fb", paper: "#ffffff" },
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: [
      "Nunito",
      "Segoe UI",
      "system-ui",
      "-apple-system",
      "Roboto",
      "Arial",
      "sans-serif",
    ].join(","),
    h4: { fontWeight: 800, letterSpacing: -0.5 },
    h5: { fontWeight: 800 },
    h6: { fontWeight: 700 },
    button: { fontWeight: 700, textTransform: "none" },
  },
  components: {
    MuiButton: {
      defaultProps: { variant: "contained", disableElevation: true },
      styleOverrides: { root: { borderRadius: 999, paddingInline: 18 } },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { border: "1px solid rgba(15,23,42,0.08)", borderRadius: 18 },
      },
    },
    MuiAppBar: { styleOverrides: { root: { borderRadius: 0 } } },
  },
});
