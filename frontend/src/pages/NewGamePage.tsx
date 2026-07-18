import { useAuth } from "@lars-kluijtmans/react-auth";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { Trash2, UserPlus, User as UserIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { api } from "../api/backend";
import type { NewPlayerInput, TargetType } from "../api/backend";

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 10;

export function NewGamePage() {
  const { t } = useTranslation("app");
  const { getAccessToken } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [targetType, setTargetType] = useState<TargetType>("rounds");
  const [targetValue, setTargetValue] = useState(5);
  const [players, setPlayers] = useState<NewPlayerInput[]>([]);
  const [guestName, setGuestName] = useState("");
  const [myName, setMyName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const hasMe = players.some((p) => p.kind === "account");

  // Load my display name so "Add me" seats an account player with the right label.
  const loadMe = useCallback(() => api.getMe(getAccessToken), [getAccessToken]);
  useEffect(() => {
    let active = true;
    loadMe()
      .then((me) => {
        if (active) setMyName(me.display_name || me.email || t("newGame.you"));
      })
      .catch(() => {
        if (active) setMyName(t("newGame.you"));
      });
    return () => {
      active = false;
    };
  }, [loadMe, t]);

  const addMe = () => {
    if (hasMe || players.length >= MAX_PLAYERS) return;
    setPlayers((ps) => [...ps, { kind: "account", display_name: myName || t("newGame.you") }]);
  };

  const addGuest = () => {
    const nm = guestName.trim();
    if (!nm || players.length >= MAX_PLAYERS) return;
    setPlayers((ps) => [...ps, { kind: "guest", display_name: nm }]);
    setGuestName("");
  };

  const removeAt = (i: number) => setPlayers((ps) => ps.filter((_, idx) => idx !== i));

  const submit = async () => {
    setError(null);
    if (players.length < MIN_PLAYERS) {
      setError(t("newGame.needTwo"));
      return;
    }
    if (players.length > MAX_PLAYERS) {
      setError(t("newGame.tooMany"));
      return;
    }
    setSubmitting(true);
    try {
      const game = await api.createGame(getAccessToken, {
        name: name.trim() || undefined,
        target_type: targetType,
        target_value: targetValue,
        players,
      });
      navigate(`/games/${game.id}`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSubmitting(false);
    }
  };

  return (
    <Stack spacing={2.5}>
      <Typography variant="h4">{t("newGame.title")}</Typography>

      <Card>
        <CardContent>
          <Stack spacing={2.5}>
            <TextField
              label={t("newGame.nameLabel")}
              placeholder={t("newGame.namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
            />

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {t("newGame.targetLabel")}
              </Typography>
              <ToggleButtonGroup
                exclusive
                color="primary"
                value={targetType}
                onChange={(_e, v: TargetType | null) => v && setTargetType(v)}
                fullWidth
                size="small"
              >
                <ToggleButton value="rounds">{t("newGame.targetRounds")}</ToggleButton>
                <ToggleButton value="points">{t("newGame.targetPoints")}</ToggleButton>
              </ToggleButtonGroup>
              <TextField
                type="number"
                sx={{ mt: 1.5 }}
                label={
                  targetType === "rounds"
                    ? t("newGame.targetValueRounds")
                    : t("newGame.targetValuePoints")
                }
                value={targetValue}
                onChange={(e) =>
                  setTargetValue(Math.max(1, Math.round(Number(e.target.value) || 0)))
                }
                slotProps={{ htmlInput: { min: 1 } }}
                fullWidth
              />
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack
            direction="row"
            sx={{ alignItems: "center", justifyContent: "space-between", mb: 1 }}
          >
            <Typography variant="h6">{t("newGame.players")}</Typography>
            <Chip
              size="small"
              color={
                players.length >= MIN_PLAYERS && players.length <= MAX_PLAYERS
                  ? "success"
                  : "default"
              }
              label={`${players.length} / ${MAX_PLAYERS}`}
            />
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t("newGame.playersHint")}
          </Typography>

          <Stack spacing={1} sx={{ mb: 2 }}>
            {players.map((p, i) => (
              <Stack
                key={i}
                direction="row"
                spacing={1.5}
                sx={{ alignItems: "center", p: 1, borderRadius: 2, bgcolor: "action.hover" }}
              >
                <Chip size="small" label={t("newGame.seat", { n: i + 1 })} />
                <UserIcon size={16} />
                <Typography sx={{ flexGrow: 1 }} noWrap>
                  {p.display_name}
                  {p.kind === "account" && (
                    <Chip size="small" color="secondary" sx={{ ml: 1 }} label={t("newGame.you")} />
                  )}
                </Typography>
                <IconButton
                  size="small"
                  color="error"
                  aria-label={t("newGame.remove")}
                  onClick={() => removeAt(i)}
                >
                  <Trash2 size={16} />
                </IconButton>
              </Stack>
            ))}
          </Stack>

          <Divider sx={{ mb: 2 }} />

          <Stack spacing={1.5}>
            <Button
              variant="outlined"
              startIcon={<UserIcon size={18} />}
              disabled={hasMe || players.length >= MAX_PLAYERS}
              onClick={addMe}
            >
              {t("newGame.addMe")}
            </Button>
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                label={t("newGame.guestName")}
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addGuest();
                  }
                }}
                fullWidth
              />
              <Button
                startIcon={<UserPlus size={18} />}
                disabled={!guestName.trim() || players.length >= MAX_PLAYERS}
                onClick={addGuest}
              >
                {t("newGame.addGuest")}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {error && <Alert severity="error">{error}</Alert>}

      <Stack direction="row" spacing={1.5}>
        <Button variant="text" onClick={() => navigate("/")}>
          {t("cancel")}
        </Button>
        <Button
          sx={{ flexGrow: 1 }}
          disabled={submitting || players.length < MIN_PLAYERS}
          onClick={() => void submit()}
        >
          {t("newGame.create")}
        </Button>
      </Stack>
    </Stack>
  );
}
