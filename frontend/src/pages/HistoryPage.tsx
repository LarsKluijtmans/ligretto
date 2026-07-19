import { useAuth } from "@lars-kluijtmans/react-auth";
import { alpha, Box, Button, Card, CardContent, Stack, Typography, useTheme } from "@mui/material";
import { Gamepad2, Percent, Plus, Target, Trophy, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { api } from "../api/backend";
import type { GameListItem, MyStats } from "../api/backend";
import { AsyncBoundary } from "../components/AsyncBoundary";
import { GameCard } from "../components/GameCard";
import { useAsync } from "../hooks/useAsync";

const PAGE = 20;

export function HistoryPage() {
  const { t } = useTranslation("app");
  const { getAccessToken } = useAuth();
  const navigate = useNavigate();

  const loadStats = useCallback(() => api.myStats(getAccessToken), [getAccessToken]);
  const { data: stats } = useAsync<MyStats>(loadStats);

  const [items, setItems] = useState<GameListItem[]>([]);
  const [offset, setOffset] = useState(0);
  const [more, setMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (nextOffset: number, replace: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const page = await api.history(getAccessToken, PAGE, nextOffset);
        setItems((prev) => (replace ? page : [...prev, ...page]));
        setOffset(nextOffset + page.length);
        setMore(page.length === PAGE);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [getAccessToken],
  );

  useEffect(() => {
    void fetchPage(0, true);
  }, [fetchPage]);

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h4">{t("history.title")}</Typography>
        <Typography variant="body2" color="text.secondary">
          {t("history.subtitle")}
        </Typography>
      </Box>

      {stats && stats.games_played > 0 && <StatsHero stats={stats} />}

      <AsyncBoundary
        loading={loading && items.length === 0}
        error={items.length === 0 ? error : null}
        onRetry={() => void fetchPage(0, true)}
      >
        {items.length === 0 ? (
          <EmptyState onNew={() => navigate("/games/new")} />
        ) : (
          <Stack spacing={1.5}>
            {items.map((g) => (
              <GameCard key={g.id} game={g} onOpen={() => navigate(`/games/${g.id}`)} />
            ))}
            {more && (
              <Button
                variant="outlined"
                disabled={loading}
                onClick={() => void fetchPage(offset, false)}
                sx={{ alignSelf: "center", mt: 0.5 }}
              >
                {t("history.loadMore")}
              </Button>
            )}
          </Stack>
        )}
      </AsyncBoundary>
    </Stack>
  );
}

// A vivid gradient "sweep" banner (the branded primary → secondary, Ligretto red → blue by default)
// that carries the player's lifetime stats as tiles.
function StatsHero({ stats }: { stats: MyStats }) {
  const { t } = useTranslation("app");
  return (
    <Card
      sx={{
        border: "none",
        borderRadius: 4,
        overflow: "hidden",
        color: "#fff",
        background: (th) =>
          `linear-gradient(135deg, ${th.palette.primary.main} 0%, ${th.palette.secondary.main} 100%)`,
        boxShadow: "0 14px 34px -16px rgba(15,23,42,0.55)",
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Typography
          variant="overline"
          sx={{ color: "rgba(255,255,255,0.9)", letterSpacing: 1.5, fontWeight: 700 }}
        >
          {t("stats.title")}
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 0.5 }}>
          <StatTile icon={<Gamepad2 size={18} />} label={t("stats.gamesPlayed")} value={stats.games_played} />
          <StatTile icon={<Trophy size={18} />} label={t("stats.wins")} value={stats.wins} />
          <StatTile
            icon={<Percent size={18} />}
            label={t("stats.winRate")}
            value={`${Math.round(stats.win_rate * 100)}%`}
          />
          <StatTile icon={<Target size={18} />} label={t("stats.avgScore")} value={Math.round(stats.avg_score)} />
          <StatTile icon={<Zap size={18} />} label={t("stats.bestRound")} value={stats.best_round} />
        </Box>
      </CardContent>
    </Card>
  );
}

function StatTile({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return (
    <Stack spacing={0.5} sx={{ alignItems: "center", flex: "1 1 82px", minWidth: 82, py: 1 }}>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          bgcolor: "rgba(255,255,255,0.2)",
        }}
      >
        {icon}
      </Box>
      <Typography sx={{ fontWeight: 800, fontSize: "1.4rem", lineHeight: 1 }}>{value}</Typography>
      <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)", textAlign: "center" }}>
        {label}
      </Typography>
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
        <Typography variant="h6">{t("history.empty")}</Typography>
        <Button startIcon={<Plus size={18} />} onClick={onNew}>
          {t("dashboard.newGame")}
        </Button>
      </Stack>
    </Card>
  );
}
