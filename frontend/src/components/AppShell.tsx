import { useAuth } from "@lars-kluijtmans/react-auth";
import {
  AppBar,
  Avatar,
  Box,
  BottomNavigation,
  BottomNavigationAction,
  Container,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import { BookOpen, History as HistoryIcon, LayoutGrid, LogOut, User } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useBranding } from "../branding/BrandingThemeProvider";
import { InvitationsBell } from "../invitations/InvitationsBell";
import { PlayerAvatar } from "../profile/PlayerAvatar";
import { useProfile } from "../profile/ProfileContext";

// The signed-in shell: a branded top bar, language switch + logout, a routed content area
// (<Outlet/>), and a mobile-first bottom navigation between the main sections.
export function AppShell() {
  const { t } = useTranslation("app");
  const { logout } = useAuth();
  const { branding } = useBranding();
  const { me } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();

  // Account dropdown (top-right avatar) — holds Profile + Log out.
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const closeMenu = () => setMenuAnchor(null);
  const go = (to: string) => {
    closeMenu();
    navigate(to);
  };

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
          <InvitationsBell />
          <Tooltip title={me?.display_name || t("menu.account")}>
            <IconButton
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              aria-label={t("menu.account")}
              aria-haspopup="true"
              aria-expanded={Boolean(menuAnchor)}
              sx={{ p: 0.25 }}
            >
              {me ? (
                <PlayerAvatar
                  source={me}
                  size={34}
                  sx={{ border: "2px solid", borderColor: "rgba(255,255,255,0.7)" }}
                />
              ) : (
                <Avatar sx={{ width: 34, height: 34, bgcolor: "secondary.main" }} />
              )}
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={closeMenu}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            slotProps={{ paper: { sx: { minWidth: 200, mt: 0.5 } } }}
          >
            {me && (
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
                  {me.display_name}
                </Typography>
                {me.email && (
                  <Typography variant="caption" color="text.secondary" noWrap component="div">
                    {me.email}
                  </Typography>
                )}
              </Box>
            )}
            {me && <Divider />}
            <MenuItem onClick={() => go("/profile")}>
              <ListItemIcon>
                <User size={18} />
              </ListItemIcon>
              {t("profile.title")}
            </MenuItem>
            <MenuItem
              onClick={() => {
                closeMenu();
                logout();
              }}
            >
              <ListItemIcon>
                <LogOut size={18} />
              </ListItemIcon>
              {t("logout")}
            </MenuItem>
          </Menu>
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
