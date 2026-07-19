import { useAuth } from "@lars-kluijtmans/react-auth";
import { Box, CircularProgress, Stack, TextField, Typography } from "@mui/material";
import { Check, Search, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api/backend";
import type { PlayerCardData } from "../api/backend";
import { PlayerCard } from "./PlayerCard";

const MIN_QUERY = 2;
const DEBOUNCE_MS = 300;

// Debounced search over existing Ligretto players → a list of PlayerCards. When `onPick` is given each
// result card IS the button (tap anywhere → onPick), and `isPicked` dims + check-marks the ones already
// chosen. Omit both for discovery-only.
export function PlayerSearchField({
  onPick,
  isPicked,
}: {
  onPick?: (player: PlayerCardData) => void;
  isPicked?: (player: PlayerCardData) => boolean;
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
        {results.map((p) => {
          const picked = isPicked?.(p) ?? false;
          return (
            <PlayerCard
              key={p.id}
              player={p}
              onClick={onPick && !picked ? () => onPick(p) : undefined}
              disabled={picked}
              trailing={
                onPick ? (
                  picked ? <Check size={18} /> : <UserPlus size={18} />
                ) : undefined
              }
            />
          );
        })}
      </Stack>
    </Stack>
  );
}
