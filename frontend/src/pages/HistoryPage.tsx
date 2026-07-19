import { useAuth } from "@lars-kluijtmans/react-auth";
import {
  alpha,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import {
  Calendar,
  Crown,
  Gamepad2,
  Hourglass,
  Percent,
  Plus,
  Target,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { api } from "../api/backend";
import type { GameListItem, GameStatus, MyStats } from "../api/backend";
import { AsyncBoundary } from "../components/AsyncBoundary";
import { StatusChip } from "../components/StatusChip";
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
              <GameHistoryCard key={g.id} g={g} onOpen={() => navigate(`/games/${g.id}`)} />
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

// A vivid gradient "sweep" banner (Ligretto red → blue, or the branded primary → secondary) that
// carries the player's lifetime stats as tiles.
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

const STATUS_ACCENT: Record<GameStatus, "success" | "warning" | "secondary"> = {
  active: "success",
  completed: "secondary",
  abandoned: "warning",
};

function GameHistoryCard({ g, onOpen }: { g: GameListItem; onOpen: () => void }) {
  const { t } = useTranslation("app");
  const theme = useTheme();
  const completed = g.status === "completed";
  const accent = theme.palette[STATUS_ACCENT[g.status]].main;

  const targetLabel =
    g.target_type === "endless"
      ? t("dashboard.target_endless")
      : g.target_type === "rounds"
        ? t("dashboard.target_rounds", { n: g.target_value })
        : t("dashboard.target_points", { n: g.target_value });

  const date = new Date(g.created_at).toLocaleDateString(undefined, {
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
          {/* status accent strip */}
          <Box sx={{ width: 6, flexShrink: 0, bgcolor: accent }} />
          <CardContent sx={{ flexGrow: 1, minWidth: 0, py: 1.75 }}>
            <Stack direction="row" sx={{ alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
              <Typography variant="h6" noWrap sx={{ minWidth: 0 }}>
                {g.name || t("dashboard.round", { n: g.current_round })}
              </Typography>
              <StatusChip status={g.status} />
            </Stack>

            <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75, mt: 1 }}>
              <Meta icon={<Calendar size={13} />} label={date} />
              <Meta icon={<Users size={13} />} label={t("dashboard.players", { count: g.player_count })} />
              <Meta icon={<Hourglass size={13} />} label={`${g.current_round} ${t("game.rounds")}`} />
              <Meta icon={<Target size={13} />} label={targetLabel} />
            </Stack>

            {(g.leader_name || g.host_name) && (
              <Stack
                direction="row"
                sx={{ alignItems: "center", justifyContent: "space-between", gap: 1, mt: 1.25 }}
              >
                {g.leader_name ? (
                  <Chip
                    size="small"
                    icon={completed ? <Trophy size={14} /> : <Crown size={14} />}
                    label={g.leader_name}
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
                {g.host_name && (
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ flexShrink: 0 }}>
                    {t("game.hostedBy", { name: g.host_name })}
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
