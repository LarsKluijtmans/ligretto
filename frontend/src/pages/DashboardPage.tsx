import { useAuth } from "@lars-kluijtmans/react-auth";
import { alpha, Box, Button, Card, Stack, Typography, useTheme } from "@mui/material";
import { Gamepad2, Plus } from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { api } from "../api/backend";
import type { GameListItem } from "../api/backend";
import { AsyncBoundary } from "../components/AsyncBoundary";
import { GameCard } from "../components/GameCard";
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
          <EmptyState onNew={() => navigate("/games/new")} />
        ) : (
          <Stack spacing={1.5}>
            {games?.map((g) => (
              <GameCard key={g.id} game={g} onOpen={() => navigate(`/games/${g.id}`)} />
            ))}
          </Stack>
        )}
      </AsyncBoundary>
    </Stack>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  const { t } = useTranslation("app");
  const theme = useTheme();
  return (
    <Card sx={{ textAlign: "center", py: 6, px: 2 }}>
      <Stack spacing={1.5} sx={{ alignItems: "center" }}>
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            color: "primary.main",
          }}
        >
          <Gamepad2 size={30} />
        </Box>
        <Typography variant="h6">{t("dashboard.empty")}</Typography>
        <Button startIcon={<Plus size={18} />} onClick={onNew}>
          {t("dashboard.emptyCta")}
        </Button>
      </Stack>
    </Card>
  );
}
