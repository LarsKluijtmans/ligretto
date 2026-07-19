import { useAuth } from "@lars-kluijtmans/react-auth";
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { api } from "../api/backend";
import type { GameListItem, MyStats } from "../api/backend";
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

      {stats && (
        <Card>
          <CardContent>
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-around",
                gap: 1,
              }}
            >
              <Stat label={t("stats.gamesPlayed")} value={stats.games_played} />
              <Stat label={t("stats.wins")} value={stats.wins} />
              <Stat label={t("stats.winRate")} value={`${Math.round(stats.win_rate * 100)}%`} />
              <Stat label={t("stats.avgScore")} value={Math.round(stats.avg_score)} />
              <Stat label={t("stats.bestRound")} value={stats.best_round} />
            </Box>
          </CardContent>
        </Card>
      )}

      <AsyncBoundary
        loading={loading && items.length === 0}
        error={items.length === 0 ? error : null}
        onRetry={() => void fetchPage(0, true)}
      >
        {items.length === 0 ? (
          <Typography color="text.secondary">{t("history.empty")}</Typography>
        ) : (
          <Stack spacing={1.5}>
            {items.map((g) => (
              <Card key={g.id}>
                <CardActionArea onClick={() => navigate(`/games/${g.id}`)}>
                  <CardContent>
                    <Stack
                      direction="row"
                      sx={{ alignItems: "center", justifyContent: "space-between", gap: 1 }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="h6" noWrap>
                          {g.name || t("dashboard.round", { n: g.current_round })}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(g.created_at).toLocaleDateString()} ·{" "}
                          {t("dashboard.players", { count: g.player_count })}
                          {g.leader_name ? ` · ${t("dashboard.leader", { name: g.leader_name })}` : ""}
                        </Typography>
                        {g.host_name && (
                          <Typography variant="caption" color="text.secondary" component="div">
                            {t("game.hostedBy", { name: g.host_name })}
                          </Typography>
                        )}
                      </Box>
                      <StatusChip status={g.status} />
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
            {more && (
              <Button
                variant="outlined"
                disabled={loading}
                onClick={() => void fetchPage(offset, false)}
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

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Stack sx={{ alignItems: "center", py: 1, minWidth: 72 }}>
      <Typography variant="h5" sx={{ fontWeight: 800 }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
        {label}
      </Typography>
    </Stack>
  );
}
