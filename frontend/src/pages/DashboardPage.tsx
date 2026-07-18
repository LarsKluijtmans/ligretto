import { useAuth } from "@lars-kluijtmans/react-auth";
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import { Plus, Users } from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { api } from "../api/backend";
import type { GameListItem } from "../api/backend";
import { AsyncBoundary } from "../components/AsyncBoundary";
import { StatusChip } from "../components/StatusChip";
import { useAsync } from "../hooks/useAsync";

export function DashboardPage() {
  const { t } = useTranslation("app");
  const { getAccessToken } = useAuth();
  const navigate = useNavigate();

  const load = useCallback(() => api.listGames(getAccessToken), [getAccessToken]);
  const { data: games, loading, error, reload } = useAsync<GameListItem[]>(load);

  return (
    <Stack spacing={2.5}>
      <Stack
        direction="row"
        sx={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}
      >
        <Box>
          <Typography variant="h4">{t("dashboard.title")}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t("dashboard.subtitle")}
          </Typography>
        </Box>
        <Button startIcon={<Plus size={18} />} onClick={() => navigate("/games/new")}>
          {t("dashboard.newGame")}
        </Button>
      </Stack>

      <AsyncBoundary loading={loading} error={error} onRetry={reload}>
        {games && games.length === 0 ? (
          <Card>
            <CardContent>
              <Stack spacing={2} sx={{ alignItems: "center", py: 5 }}>
                <Typography color="text.secondary">{t("dashboard.empty")}</Typography>
                <Button startIcon={<Plus size={18} />} onClick={() => navigate("/games/new")}>
                  {t("dashboard.emptyCta")}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        ) : (
          <Stack spacing={1.5}>
            {games?.map((g) => (
              <GameRow key={g.id} game={g} onOpen={() => navigate(`/games/${g.id}`)} />
            ))}
          </Stack>
        )}
      </AsyncBoundary>
    </Stack>
  );
}

function GameRow({ game, onOpen }: { game: GameListItem; onOpen: () => void }) {
  const { t } = useTranslation("app");
  const targetLabel =
    game.target_type === "rounds"
      ? t("dashboard.target_rounds", { n: game.target_value })
      : t("dashboard.target_points", { n: game.target_value });

  return (
    <Card>
      <CardActionArea onClick={onOpen}>
        <CardContent>
          <Stack
            direction="row"
            sx={{ alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" noWrap>
                {game.name || t("dashboard.round", { n: game.current_round })}
              </Typography>
              <Stack
                direction="row"
                spacing={1}
                sx={{ mt: 0.5, alignItems: "center", flexWrap: "wrap" }}
              >
                <Chip
                  size="small"
                  variant="outlined"
                  icon={<Users size={14} />}
                  label={t("dashboard.players", { count: game.player_count })}
                />
                <Chip size="small" variant="outlined" label={targetLabel} />
                <Chip
                  size="small"
                  variant="outlined"
                  label={t("dashboard.round", { n: game.current_round })}
                />
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {game.leader_name
                  ? t("dashboard.leader", { name: game.leader_name })
                  : t("dashboard.noLeader")}
              </Typography>
            </Box>
            <StatusChip status={game.status} />
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
