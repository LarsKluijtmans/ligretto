import { useAuth } from "@lars-kluijtmans/react-auth";
import {
  Badge,
  Box,
  Button,
  Divider,
  IconButton,
  Menu,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { Bell } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { api } from "../api/backend";
import { PlayerAvatar } from "../profile/PlayerAvatar";
import { useInvitations } from "./InvitationsContext";

// Top-bar bell: a badge with the pending-invite count, opening a list to accept/decline. Accepting
// takes you to the game.
export function InvitationsBell() {
  const { t } = useTranslation("app");
  const { getAccessToken } = useAuth();
  const { invites, refresh } = useInvitations();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const close = () => setAnchor(null);

  async function respond(id: number, action: "accept" | "decline", gameId?: number) {
    setBusy(id);
    try {
      if (action === "accept") await api.acceptInvitation(getAccessToken, id);
      else await api.declineInvitation(getAccessToken, id);
      refresh();
      if (action === "accept" && gameId != null) {
        close();
        navigate(`/games/${gameId}`);
      }
    } catch {
      /* leave the invite in place; the list will still show it */
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Tooltip title={t("invites.title")}>
        <IconButton
          color="inherit"
          onClick={(e) => setAnchor(e.currentTarget)}
          aria-label={t("invites.title")}
        >
          <Badge badgeContent={invites.length} color="error" max={9}>
            <Bell size={20} />
          </Badge>
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { width: 340, maxWidth: "92vw", mt: 0.5 } } }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {t("invites.title")}
          </Typography>
        </Box>
        <Divider />
        {invites.length === 0 ? (
          <Box sx={{ px: 2, py: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {t("invites.empty")}
            </Typography>
          </Box>
        ) : (
          invites.map((inv) => (
            <Box key={inv.id} sx={{ px: 2, py: 1.25 }}>
              <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
                <PlayerAvatar source={inv.inviter} size={32} />
                <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                  <Typography variant="body2" noWrap>
                    {t("invites.from", { name: inv.inviter.display_name })}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap component="div">
                    {inv.game_name || t("invites.aGame")}
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ mt: 1, justifyContent: "flex-end" }}>
                <Button
                  size="small"
                  color="inherit"
                  disabled={busy === inv.id}
                  onClick={() => void respond(inv.id, "decline")}
                >
                  {t("invites.decline")}
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  disabled={busy === inv.id}
                  onClick={() => void respond(inv.id, "accept", inv.game_id)}
                >
                  {t("invites.accept")}
                </Button>
              </Stack>
            </Box>
          ))
        )}
      </Menu>
    </>
  );
}
