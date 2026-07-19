import { Box, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { PlayerCardData } from "../api/backend";
import { PlayerAvatar } from "../profile/PlayerAvatar";

// A player's public card: icon + display name + win rate. NEVER shows email. The `action` slot is
// where the invite button attaches (bolt 012); in bolt 010 the card is discovery-only.
export function PlayerCard({
  player,
  action,
}: {
  player: PlayerCardData;
  action?: ReactNode;
}) {
  const { t } = useTranslation("app");
  const winLabel =
    player.win_rate == null
      ? t("players.noGames")
      : t("players.winRate", { pct: Math.round(player.win_rate * 100) });

  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{ alignItems: "center", p: 1, borderRadius: 2, bgcolor: "action.hover" }}
    >
      <PlayerAvatar
        source={{
          icon_type: player.icon_type,
          icon_value: player.icon_value,
          avatar_data_url: player.avatar_data_url,
          display_name: player.display_name,
        }}
        size={40}
      />
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography noWrap sx={{ fontWeight: 600 }}>
          {player.display_name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {winLabel}
        </Typography>
      </Box>
      {action}
    </Stack>
  );
}
