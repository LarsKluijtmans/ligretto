import { useAuth } from "@lars-kluijtmans/react-auth";
import {
  AppBar,
  Avatar,
  Box,
  BottomNavigation,
  BottomNavigationAction,
  Button,
  Container,
  Paper,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import { BookOpen, History as HistoryIcon, LayoutGrid, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useBranding } from "../branding/BrandingThemeProvider";
import { LanguageSwitcher } from "./LanguageSwitcher";

// The signed-in shell: a branded top bar, language switch + logout, a routed content area
// (<Outlet/>), and a mobile-first bottom navigation between the main sections.
export function AppShell() {
  const { t } = useTranslation("app");
  const { logout } = useAuth();
  const { branding } = useBranding();
  const navigate = useNavigate();
  const location = useLocation();

  // Map the current path to the active bottom-nav tab.
  const path = location.pathname;
  const tab = path.startsWith("/rules")
    ? "/rules"
    : path.startsWith("/history")
      ? "/history"
      : "/";

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: 9 }}>
      <AppBar position="sticky" color="primary" elevation={0}>
        <Toolbar>
          <Stack
            direction="row"
            spacing={1.25}
            sx={{ flexGrow: 1, alignItems: "center", cursor: "pointer" }}
            onClick={() => navigate("/")}
          >
            {branding.logoUrl ? (
              <Box component="img" src={branding.logoUrl} alt="" sx={{ height: 32 }} />
            ) : (
              <Avatar sx={{ width: 34, height: 34, bgcolor: "secondary.main", fontWeight: 800 }}>
                L
              </Avatar>
            )}
            <Box sx={{ lineHeight: 1 }}>
              <Typography variant="h6" noWrap sx={{ fontWeight: 800, lineHeight: 1.1 }}>
                {t("title")}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.85 }}>
                {t("tagline")}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <LanguageSwitcher />
            <Button color="inherit" startIcon={<LogOut size={18} />} onClick={logout}>
              <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                {t("logout")}
              </Box>
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 3 }}>
        <Outlet />
      </Container>

      <Paper
        elevation={8}
        sx={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1200 }}
      >
        <BottomNavigation
          showLabels
          value={tab}
          onChange={(_e, value: string) => navigate(value)}
        >
          <BottomNavigationAction
            label={t("nav.dashboard")}
            value="/"
            icon={<LayoutGrid size={22} />}
          />
          <BottomNavigationAction
            label={t("nav.history")}
            value="/history"
            icon={<HistoryIcon size={22} />}
          />
          <BottomNavigationAction
            label={t("nav.rules")}
            value="/rules"
            icon={<BookOpen size={22} />}
          />
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
