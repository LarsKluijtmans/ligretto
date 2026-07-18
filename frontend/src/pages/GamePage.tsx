import { useAuth } from "@lars-kluijtmans/react-auth";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { ArrowLeft, Ban, Crown, Flag, Pencil, Plus } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { api, leaderIds, targetReached } from "../api/backend";
import type { GameDetail, RoundScoreInput } from "../api/backend";
import { AsyncBoundary } from "../components/AsyncBoundary";
import { RoundEntryForm } from "../components/RoundEntryForm";
import { StatusChip } from "../components/StatusChip";
import { useAsync } from "../hooks/useAsync";

export function GamePage() {
  const { t } = useTranslation("app");
  const { getAccessToken } = useAuth();
  const navigate = useNavigate();
  const { id = "" } = useParams();

  const load = useCallback(() => api.getGame(getAccessToken, id), [getAccessToken, id]);
  const { data: game, loading, error, reload } = useAsync<GameDetail>(load, [id]);

  const [editing, setEditing] = useState<number | null>(null); // round number being edited
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [promptDismissed, setPromptDismissed] = useState(false);
  const [confirm, setConfirm] = useState<"finish" | "abandon" | null>(null);
  const [mutError, setMutError] = useState<string | null>(null);

  const runMutation = async (fn: () => Promise<GameDetail>, after?: () => void) => {
    setBusy(true);
    setMutError(null);
    try {
      await fn();
      after?.();
      reload();
    } catch (e) {
      setMutError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const submitNewRound = (scores: RoundScoreInput[]) =>
    void runMutation(
      () => api.submitRound(getAccessToken, id, { scores }),
      () => {
        setAdding(false);
        setPromptDismissed(false);
      },
    );

  const submitEditRound = (number: number, scores: RoundScoreInput[]) =>
    void runMutation(
      () => api.updateRound(getAccessToken, id, number, { scores }),
      () => setEditing(null),
    );

  const doFinish = () => void runMutation(() => api.finishGame(getAccessToken, id), () => setConfirm(null));
  const doAbandon = () =>
    void runMutation(() => api.abandonGame(getAccessToken, id), () => {
      setConfirm(null);
      navigate("/");
    });

  return (
    <Stack spacing={2.5}>
      <Button
        variant="text"
        color="inherit"
        startIcon={<ArrowLeft size={18} />}
        onClick={() => navigate("/")}
        sx={{ alignSelf: "flex-start" }}
      >
        {t("back")}
      </Button>

      <AsyncBoundary loading={loading} error={error} onRetry={reload}>
        {game && (
          <GameBody
            game={game}
            active={game.status === "active"}
            editing={editing}
            adding={adding}
            busy={busy}
            mutError={mutError}
            onAdd={() => {
              setAdding(true);
              setEditing(null);
            }}
            onEdit={(n) => {
              setEditing(n);
              setAdding(false);
            }}
            onCancelForm={() => {
              setAdding(false);
              setEditing(null);
            }}
            onSubmitNew={submitNewRound}
            onSubmitEdit={submitEditRound}
            onFinish={() => setConfirm("finish")}
            onAbandon={() => setConfirm("abandon")}
          />
        )}
      </AsyncBoundary>

      {/* Finish prompt when the target has been reached. */}
      <Dialog
        open={Boolean(game && game.status === "active" && targetReached(game) && !promptDismissed)}
        onClose={() => setPromptDismissed(true)}
      >
        <DialogTitle>{t("game.targetReached")}</DialogTitle>
        <DialogActions>
          <Button variant="text" onClick={() => setPromptDismissed(true)}>
            {t("game.keepPlaying")}
          </Button>
          <Button onClick={doFinish} disabled={busy}>
            {t("game.finishNow")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Finish / abandon confirmation. */}
      <Dialog open={confirm !== null} onClose={() => setConfirm(null)}>
        <DialogTitle>
          {confirm === "finish" ? t("game.finish") : t("game.abandon")}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirm === "finish" ? t("game.finishConfirm") : t("game.abandonConfirm")}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setConfirm(null)}>
            {t("cancel")}
          </Button>
          <Button
            color={confirm === "abandon" ? "error" : "primary"}
            disabled={busy}
            onClick={confirm === "finish" ? doFinish : doAbandon}
          >
            {confirm === "finish" ? t("game.finishNow") : t("game.abandon")}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

function GameBody({
  game,
  active,
  editing,
  adding,
  busy,
  mutError,
  onAdd,
  onEdit,
  onCancelForm,
  onSubmitNew,
  onSubmitEdit,
  onFinish,
  onAbandon,
}: {
  game: GameDetail;
  active: boolean;
  editing: number | null;
  adding: boolean;
  busy: boolean;
  mutError: string | null;
  onAdd: () => void;
  onEdit: (n: number) => void;
  onCancelForm: () => void;
  onSubmitNew: (scores: RoundScoreInput[]) => void;
  onSubmitEdit: (n: number, scores: RoundScoreInput[]) => void;
  onFinish: () => void;
  onAbandon: () => void;
}) {
  const { t } = useTranslation("app");

  const leaders = leaderIds(game.players);
  const byTotal = [...game.players].sort((a, b) => b.total - a.total);
  const seatOrder = [...game.players].sort((a, b) => a.seat - b.seat);
  const winner =
    game.status === "completed"
      ? game.players.find((p) => p.id === game.winner) ??
        (leaders.length === 1 ? game.players.find((p) => p.id === leaders[0]) : undefined)
      : undefined;

  const targetLabel =
    game.target_type === "rounds"
      ? t("dashboard.target_rounds", { n: game.target_value })
      : t("dashboard.target_points", { n: game.target_value });

  const editingRound = editing !== null ? game.rounds.find((r) => r.number === editing) : undefined;

  return (
    <Stack spacing={2.5}>
      {/* Header */}
      <Stack
        direction="row"
        sx={{ alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}
      >
        <Box>
          <Typography variant="h4">
            {game.name || t("game.round", { n: game.rounds.length })}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
            <StatusChip status={game.status} />
            <Chip size="small" variant="outlined" label={targetLabel} />
            <Chip
              size="small"
              variant="outlined"
              label={`${game.rounds.length} ${t("game.rounds")}`}
            />
          </Stack>
        </Box>
      </Stack>

      {winner && (
        <Alert severity="success" icon={<Crown size={20} />}>
          {t("game.winnerIs", { name: winner.display_name })}
        </Alert>
      )}
      {game.status === "abandoned" && <Alert severity="warning">{t("game.abandonedNote")}</Alert>}

      {/* Standings */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1.5 }}>
            {t("game.standings")}
          </Typography>
          <Stack spacing={1}>
            {byTotal.map((p, i) => {
              const isLeader = leaders.includes(p.id);
              return (
                <Stack
                  key={p.id}
                  direction="row"
                  spacing={1.5}
                  sx={{
                    alignItems: "center",
                    p: 1,
                    borderRadius: 2,
                    bgcolor: isLeader ? "success.main" : "action.hover",
                    color: isLeader ? "success.contrastText" : "inherit",
                  }}
                >
                  <Typography sx={{ width: 24, fontWeight: 700, opacity: 0.8 }}>
                    {i + 1}
                  </Typography>
                  {isLeader && <Crown size={16} />}
                  <Typography sx={{ flexGrow: 1, fontWeight: 600 }} noWrap>
                    {p.display_name}
                  </Typography>
                  <Typography sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                    {p.total}
                  </Typography>
                </Stack>
              );
            })}
          </Stack>
        </CardContent>
      </Card>

      {/* Per-round grid */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1.5 }}>
            {t("game.rounds")}
          </Typography>
          {game.rounds.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t("game.noRounds")}
            </Typography>
          ) : (
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small" sx={{ minWidth: 320 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>{t("game.round", { n: "" }).trim()}</TableCell>
                    {seatOrder.map((p) => (
                      <TableCell key={p.id} align="right">
                        {p.display_name}
                      </TableCell>
                    ))}
                    {active && <TableCell align="right" />}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {game.rounds.map((r) => {
                    const byPlayer = new Map(r.scores.map((s) => [s.game_player_id, s]));
                    return (
                      <TableRow key={r.number} hover>
                        <TableCell>{r.number}</TableCell>
                        {seatOrder.map((p) => {
                          const s = byPlayer.get(p.id);
                          return (
                            <TableCell key={p.id} align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                              {s ? s.computed_score : "—"}
                            </TableCell>
                          );
                        })}
                        {active && (
                          <TableCell align="right" padding="none">
                            <IconButton
                              size="small"
                              aria-label={t("game.editRound", { n: r.number })}
                              onClick={() => onEdit(r.number)}
                            >
                              <Pencil size={15} />
                            </IconButton>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>{t("game.total")}</TableCell>
                    {seatOrder.map((p) => (
                      <TableCell
                        key={p.id}
                        align="right"
                        sx={{
                          fontWeight: 800,
                          fontVariantNumeric: "tabular-nums",
                          color: leaders.includes(p.id) ? "success.main" : "inherit",
                        }}
                      >
                        {p.total}
                      </TableCell>
                    ))}
                    {active && <TableCell />}
                  </TableRow>
                </TableBody>
              </Table>
            </Box>
          )}
        </CardContent>
      </Card>

      {mutError && <Alert severity="error">{mutError}</Alert>}

      {/* Round entry / edit */}
      {active && editingRound && (
        <RoundEntryForm
          players={seatOrder}
          roundNumber={editingRound.number}
          initial={editingRound}
          editing
          submitting={busy}
          onSubmit={(scores) => onSubmitEdit(editingRound.number, scores)}
          onCancel={onCancelForm}
        />
      )}
      {active && adding && !editingRound && (
        <RoundEntryForm
          players={seatOrder}
          roundNumber={game.rounds.length + 1}
          submitting={busy}
          onSubmit={onSubmitNew}
          onCancel={onCancelForm}
        />
      )}

      {/* Actions */}
      {active && !adding && !editingRound && (
        <Stack spacing={1.5}>
          <Button startIcon={<Plus size={18} />} onClick={onAdd}>
            {t("game.addRound")}
          </Button>
          <Divider />
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Ban size={18} />}
              onClick={onAbandon}
              disabled={busy}
            >
              {t("game.abandon")}
            </Button>
            <Button
              sx={{ flexGrow: 1 }}
              color="secondary"
              startIcon={<Flag size={18} />}
              onClick={onFinish}
              disabled={busy}
            >
              {t("game.finish")}
            </Button>
          </Stack>
        </Stack>
      )}

      {game.status === "completed" && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
          {t("game.completedNote")}
        </Typography>
      )}
    </Stack>
  );
}
