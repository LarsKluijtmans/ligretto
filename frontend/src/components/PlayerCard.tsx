import { Box, ButtonBase, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { PlayerCardData } from "../api/backend";
import { PlayerAvatar } from "../profile/PlayerAvatar";

// A player's public card: icon + name + win rate (never email). When `onClick` is given the WHOLE card
// is the action (a big tap target that works on mobile) and lights up on hover; `disabled` makes it a
// dimmed, non-clickable card (e.g. already invited). `trailing` is a small non-interactive hint (icon).
export function PlayerCard({
  player,
  onClick,
  disabled,
  trailing,
}: {
  player: PlayerCardData;
  onClick?: () => void;
  disabled?: boolean;
  trailing?: ReactNode;
}) {
  const { t } = useTranslation("app");
  const clickable = Boolean(onClick) && !disabled;
  const winLabel =
    player.win_rate == null
      ? t("players.noGames")
      : t("players.winRate", { pct: Math.round(player.win_rate * 100) });

  const inner = (
    <>
      <PlayerAvatar
        source={{
          icon_type: player.icon_type,
          icon_value: player.icon_value,
          avatar_data_url: player.avatar_data_url,
          display_name: player.display_name,
        }}
        size={40}
      />
      <Box sx={{ minWidth: 0, flexGrow: 1, textAlign: "left" }}>
        <Typography noWrap sx={{ fontWeight: 600 }}>
          {player.display_name}
        </Typography>
        <Typography variant="caption" color="text.secondary" component="div">
          {winLabel}
        </Typography>
      </Box>
      {trailing}
    </>
  );

  const rowSx = {
    display: "flex",
    alignItems: "center",
    gap: 1.5,
    width: "100%",
    p: 1,
    borderRadius: 2,
    border: "1px solid",
    borderColor: "divider",
  } as const;

  if (clickable) {
    return (
      <ButtonBase
        onClick={onClick}
        sx={{
          ...rowSx,
          justifyContent: "flex-start",
          bgcolor: "background.paper",
          transition: "background-color .15s ease, border-color .15s ease, box-shadow .15s ease",
          // Real hover only on devices that have it (so mobile taps don't stick highlighted).
          "@media (hover: hover)": {
            "&:hover": { bgcolor: "action.hover", borderColor: "primary.main", boxShadow: 2 },
          },
          "&:active": { bgcolor: "action.selected" },
        }}
      >
        {inner}
      </ButtonBase>
    );
  }

  return <Box sx={{ ...rowSx, bgcolor: "action.hover", opacity: disabled ? 0.6 : 1 }}>{inner}</Box>;
}
