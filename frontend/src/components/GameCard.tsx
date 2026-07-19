import { alpha, Box, Card, CardActionArea, CardContent, Chip, Stack, Typography, useTheme } from "@mui/material";
import { Calendar, Crown, Hourglass, Target, Trophy, Users } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { GameListItem, GameStatus } from "../api/backend";
import { StatusChip } from "./StatusChip";

// One game as a rich, tappable card — a colour-coded status accent, the name + status, pill "meta"
// chips (date, players, rounds, target), a gold winner/leader chip, and who hosts it. Shared by the
// Games (dashboard) and History pages so both read the same.
const STATUS_ACCENT: Record<GameStatus, "success" | "warning" | "secondary"> = {
  active: "success",
  completed: "secondary",
  abandoned: "warning",
};

export function GameCard({ game, onOpen }: { game: GameListItem; onOpen: () => void }) {
  const { t } = useTranslation("app");
  const theme = useTheme();
  const completed = game.status === "completed";
  const accent = theme.palette[STATUS_ACCENT[game.status]].main;

  const targetLabel =
    game.target_type === "endless"
      ? t("dashboard.target_endless")
      : game.target_type === "rounds"
        ? t("dashboard.target_rounds", { n: game.target_value })
        : t("dashboard.target_points", { n: game.target_value });

  const date = new Date(game.created_at).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Card
      sx={{
        overflow: "hidden",
        transition: "transform 140ms ease, box-shadow 140ms ease",
        "@media (hover: hover)": {
          "&:hover": { transform: "translateY(-2px)", boxShadow: "0 12px 26px -16px rgba(15,23,42,0.45)" },
        },
      }}
    >
      <CardActionArea onClick={onOpen}>
        <Box sx={{ display: "flex" }}>
          <Box sx={{ width: 6, flexShrink: 0, bgcolor: accent }} />
          <CardContent sx={{ flexGrow: 1, minWidth: 0, py: 1.75 }}>
            <Stack direction="row" sx={{ alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
              <Typography variant="h6" noWrap sx={{ minWidth: 0 }}>
                {game.name || t("dashboard.round", { n: game.current_round })}
              </Typography>
              <StatusChip status={game.status} />
            </Stack>

            <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75, mt: 1 }}>
              <Meta icon={<Calendar size={13} />} label={date} />
              <Meta icon={<Users size={13} />} label={t("dashboard.players", { count: game.player_count })} />
              <Meta icon={<Hourglass size={13} />} label={`${game.current_round} ${t("game.rounds")}`} />
              <Meta icon={<Target size={13} />} label={targetLabel} />
            </Stack>

            {(game.leader_name || game.host_name) && (
              <Stack
                direction="row"
                sx={{ alignItems: "center", justifyContent: "space-between", gap: 1, mt: 1.25 }}
              >
                {game.leader_name ? (
                  <Chip
                    size="small"
                    icon={completed ? <Trophy size={14} /> : <Crown size={14} />}
                    label={game.leader_name}
                    sx={{
                      fontWeight: 700,
                      bgcolor: alpha(theme.palette.warning.main, 0.16),
                      color: theme.palette.warning.dark,
                      "& .MuiChip-icon": { color: theme.palette.warning.dark },
                    }}
                  />
                ) : (
                  <Box />
                )}
                {game.host_name && (
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ flexShrink: 0 }}>
                    {t("game.hostedBy", { name: game.host_name })}
                  </Typography>
                )}
              </Stack>
            )}
          </CardContent>
        </Box>
      </CardActionArea>
    </Card>
  );
}

function Meta({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <Stack
      direction="row"
      spacing={0.5}
      sx={{
        alignItems: "center",
        px: 1,
        py: 0.25,
        borderRadius: 999,
        bgcolor: "action.hover",
        color: "text.secondary",
      }}
    >
      {icon}
      <Typography variant="caption" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
    </Stack>
  );
}
