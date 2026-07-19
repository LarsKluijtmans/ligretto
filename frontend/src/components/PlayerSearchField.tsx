import { useAuth } from "@lars-kluijtmans/react-auth";
import { Box, CircularProgress, Stack, TextField, Typography } from "@mui/material";
import { Search } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api/backend";
import type { PlayerCardData } from "../api/backend";
import { PlayerCard } from "./PlayerCard";

const MIN_QUERY = 2;
const DEBOUNCE_MS = 300;

// Debounced search over existing Ligretto players → a list of PlayerCards. `renderAction` lets a
// caller attach a per-card action (e.g. an Invite button in bolt 012); omit it for discovery-only.
export function PlayerSearchField({
  renderAction,
}: {
  renderAction?: (player: PlayerCardData) => ReactNode;
}) {
  const { t } = useTranslation("app");
  const { getAccessToken } = useAuth();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PlayerCardData[]>([]);
  const [loading, setLoading] = useState(false);

  const query = q.trim();

  useEffect(() => {
    if (query.length < MIN_QUERY) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let active = true;
    const timer = setTimeout(() => {
      api
        .searchPlayers(getAccessToken, query)
        .then((r) => {
          if (active) setResults(r);
        })
        .catch(() => {
          if (active) setResults([]);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, getAccessToken]);

  return (
    <Stack spacing={1.5}>
      <TextField
        size="small"
        label={t("players.searchLabel")}
        placeholder={t("players.searchPlaceholder")}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        fullWidth
        slotProps={{
          input: {
            startAdornment: <Search size={16} style={{ marginRight: 8, opacity: 0.6 }} />,
          },
        }}
      />
      {loading && (
        <Box sx={{ display: "grid", placeItems: "center", py: 1 }}>
          <CircularProgress size={20} />
        </Box>
      )}
      {!loading && query.length >= MIN_QUERY && results.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          {t("players.noResults")}
        </Typography>
      )}
      <Stack spacing={1}>
        {results.map((p) => (
          <PlayerCard key={p.id} player={p} action={renderAction?.(p)} />
        ))}
      </Stack>
    </Stack>
  );
}
