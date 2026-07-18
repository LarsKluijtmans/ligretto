import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { previewScore } from "../api/backend";
import type { GamePlayerView, RoundScoreInput, RoundView } from "../api/backend";

type Mode = "counts" | "net";

// Fast per-round entry. Either two card counts per player (centre + stack left, score computed
// live as centre − 2×stack) or a direct net. Emits a RoundScoreInput[] matching the chosen mode.
export function RoundEntryForm({
  players,
  roundNumber,
  initial,
  editing = false,
  submitting = false,
  onSubmit,
  onCancel,
}: {
  players: GamePlayerView[];
  roundNumber: number;
  initial?: RoundView;
  editing?: boolean;
  submitting?: boolean;
  onSubmit: (scores: RoundScoreInput[]) => void;
  onCancel?: () => void;
}) {
  const { t } = useTranslation("app");
  const [mode, setMode] = useState<Mode>("counts");

  // Seed per-player rows from the initial round (edit mode) or blanks.
  const seed = useMemo(() => {
    const byId = new Map(initial?.scores.map((s) => [s.game_player_id, s]));
    const rows: Record<string, { centre: string; stack: string; net: string }> = {};
    for (const p of players) {
      const s = byId.get(p.id);
      rows[p.id] = {
        centre: s ? String(s.centre_cards) : "",
        stack: s ? String(s.stack_left) : "",
        net: s ? String(s.computed_score) : "",
      };
    }
    return rows;
  }, [players, initial]);

  const [rows, setRows] = useState(seed);

  const setField = (id: string, field: "centre" | "stack" | "net", value: string) =>
    setRows((r) => ({ ...r, [id]: { ...r[id], [field]: value } }));

  const num = (v: string) => Math.round(Number(v) || 0);

  const submit = () => {
    const scores: RoundScoreInput[] = players.map((p) => {
      const row = rows[p.id];
      if (mode === "net") {
        return { game_player_id: p.id, net: num(row.net) };
      }
      return {
        game_player_id: p.id,
        centre_cards: Math.max(0, num(row.centre)),
        stack_left: Math.max(0, num(row.stack)),
      };
    });
    onSubmit(scores);
  };

  return (
    <Card sx={{ borderColor: "primary.main" }}>
      <CardContent>
        <Stack
          direction="row"
          sx={{ alignItems: "center", justifyContent: "space-between", mb: 2, gap: 1 }}
        >
          <Typography variant="h6">
            {editing ? t("game.editRound", { n: roundNumber }) : t("game.newRound", { n: roundNumber })}
          </Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            color="primary"
            value={mode}
            onChange={(_e, v: Mode | null) => v && setMode(v)}
          >
            <ToggleButton value="counts">{t("game.byCounts")}</ToggleButton>
            <ToggleButton value="net">{t("game.directNet")}</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        <Stack spacing={1.5}>
          {players.map((p) => {
            const row = rows[p.id];
            const preview = previewScore(num(row.centre), num(row.stack));
            return (
              <Stack
                key={p.id}
                direction="row"
                spacing={1.5}
                sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1 }}
              >
                <Typography sx={{ flexBasis: { xs: "100%", sm: 130 }, fontWeight: 600 }} noWrap>
                  {p.display_name}
                </Typography>
                {mode === "counts" ? (
                  <>
                    <TextField
                      size="small"
                      type="number"
                      label={t("game.centre")}
                      value={row.centre}
                      onChange={(e) => setField(p.id, "centre", e.target.value)}
                      slotProps={{ htmlInput: { min: 0, inputMode: "numeric" } }}
                      sx={{ width: 110 }}
                    />
                    <TextField
                      size="small"
                      type="number"
                      label={t("game.stack")}
                      value={row.stack}
                      onChange={(e) => setField(p.id, "stack", e.target.value)}
                      slotProps={{ htmlInput: { min: 0, inputMode: "numeric" } }}
                      sx={{ width: 110 }}
                    />
                    <Box
                      sx={{
                        ml: "auto",
                        minWidth: 64,
                        textAlign: "right",
                        fontWeight: 800,
                        color: preview >= 0 ? "success.main" : "error.main",
                      }}
                    >
                      {preview >= 0 ? `+${preview}` : preview}
                    </Box>
                  </>
                ) : (
                  <TextField
                    size="small"
                    type="number"
                    label={t("game.net")}
                    value={row.net}
                    onChange={(e) => setField(p.id, "net", e.target.value)}
                    slotProps={{ htmlInput: { inputMode: "numeric" } }}
                    sx={{ width: 130 }}
                  />
                )}
              </Stack>
            );
          })}
        </Stack>

        <Stack direction="row" spacing={1.5} sx={{ mt: 2.5 }}>
          {onCancel && (
            <Button variant="text" onClick={onCancel} disabled={submitting}>
              {t("cancel")}
            </Button>
          )}
          <Button sx={{ flexGrow: 1 }} onClick={submit} disabled={submitting}>
            {t("game.submitRound")}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
