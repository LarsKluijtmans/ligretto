import { useAuth } from "@lars-kluijtmans/react-auth";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  IconButton,
  MenuItem,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { Camera, Check, Trash2 } from "lucide-react";
import type { ChangeEvent } from "react";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { api } from "../api/backend";
import type { IconType, Me } from "../api/backend";
import { AsyncBoundary } from "../components/AsyncBoundary";
import i18n from "../i18n";
import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES } from "../locales";
import { EMOJIS, PRESET_AVATARS } from "../profile/avatars";
import { PlayerAvatar } from "../profile/PlayerAvatar";
import { useProfile } from "../profile/ProfileContext";
import { fileToAvatarDataUrl } from "../profile/resizeImage";

// The profile page: update display name + pick an icon three ways (emoji / preset avatar / photo).
// The profile is loaded once at the app root (ProfileProvider); we edit a local copy and write it
// back on save so the app-bar avatar updates instantly.
export function ProfilePage() {
  const { me, loading, error, reload } = useProfile();
  return (
    <AsyncBoundary loading={loading} error={error} onRetry={reload}>
      {me && <ProfileForm key={me.sub} me={me} />}
    </AsyncBoundary>
  );
}

type PickerTab = "emoji" | "avatars" | "photo";

function tabForIcon(iconType: IconType): PickerTab {
  if (iconType === "preset") return "avatars";
  if (iconType === "image") return "photo";
  return "emoji";
}

function ProfileForm({ me }: { me: Me }) {
  const { t } = useTranslation("app");
  const { getAccessToken } = useAuth();
  const { setMe } = useProfile();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(me.display_name ?? "");
  const [iconType, setIconType] = useState<IconType>(me.icon_type);
  const [iconValue, setIconValue] = useState<string | null>(me.icon_value);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(me.avatar_data_url);
  const [tab, setTab] = useState<PickerTab>(tabForIcon(me.icon_type));
  const [language, setLanguage] = useState<string>(me.language ?? i18n.resolvedLanguage ?? "en");
  // Snapshot the language at mount so the dirty check compares against the SAVED value, not the
  // live-changing i18n resolvedLanguage (picking a language previews it immediately).
  const [initialLanguage] = useState<string>(me.language ?? i18n.resolvedLanguage ?? "en");

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ severity: "success" | "error"; msg: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const preview = useMemo(
    () => ({
      icon_type: iconType,
      icon_value: iconValue,
      avatar_data_url: avatarDataUrl,
      display_name: displayName,
    }),
    [iconType, iconValue, avatarDataUrl, displayName],
  );

  const dirty =
    displayName !== (me.display_name ?? "") ||
    iconType !== me.icon_type ||
    iconValue !== me.icon_value ||
    avatarDataUrl !== me.avatar_data_url ||
    language !== initialLanguage;

  function pickLanguage(lng: string) {
    setLanguage(lng);
    void i18n.changeLanguage(lng); // preview immediately + cache to localStorage
  }

  function pickEmoji(emoji: string) {
    setIconType("emoji");
    setIconValue(emoji);
    setAvatarDataUrl(null);
  }
  function pickPreset(id: string) {
    setIconType("preset");
    setIconValue(id);
    setAvatarDataUrl(null);
  }
  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    try {
      const url = await fileToAvatarDataUrl(file);
      setIconType("image");
      setAvatarDataUrl(url);
      setIconValue(null);
    } catch {
      setToast({ severity: "error", msg: t("profile.photoError") });
    }
  }
  function clearIcon() {
    setIconType("none");
    setIconValue(null);
    setAvatarDataUrl(null);
  }

  async function save() {
    const name = displayName.trim();
    if (!name) {
      setToast({ severity: "error", msg: t("profile.nameRequired") });
      return;
    }
    setSaving(true);
    try {
      const updated = await api.updateProfile(getAccessToken, {
        display_name: name,
        icon_type: iconType,
        icon_value: iconType === "emoji" || iconType === "preset" ? iconValue : null,
        avatar_data_url: iconType === "image" ? avatarDataUrl : null,
        language,
      });
      setMe(updated);
      setToast({ severity: "success", msg: t("profile.saved") });
    } catch (err) {
      setToast({
        severity: "error",
        msg: `${t("profile.saveError")}: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h4">{t("profile.title")}</Typography>
        <Typography variant="body2" color="text.secondary">
          {t("profile.subtitle")}
        </Typography>
      </Box>

      <Card>
        <CardContent>
          <Stack spacing={3}>
            {/* Live preview */}
            <Stack spacing={1} sx={{ alignItems: "center" }}>
              <PlayerAvatar source={preview} size={96} />
              {me.email && (
                <Typography variant="body2" color="text.secondary">
                  {me.email}
                </Typography>
              )}
            </Stack>

            <TextField
              label={t("profile.displayName")}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              fullWidth
              slotProps={{ htmlInput: { maxLength: 255 } }}
              helperText={t("profile.displayNameHelp")}
            />

            <TextField
              select
              label={t("language")}
              value={language}
              onChange={(e) => pickLanguage(e.target.value)}
              fullWidth
              helperText={t("profile.languageHelp")}
            >
              {SUPPORTED_LANGUAGES.map((lng) => (
                <MenuItem key={lng} value={lng}>
                  {LANGUAGE_LABELS[lng]}
                </MenuItem>
              ))}
            </TextField>

            <Divider />

            {/* Icon pickers */}
            <Stack spacing={1.5}>
              <Stack
                direction="row"
                sx={{ alignItems: "center", justifyContent: "space-between", gap: 1 }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {t("profile.iconTitle")}
                </Typography>
                {iconType !== "none" && (
                  <Button
                    size="small"
                    color="inherit"
                    startIcon={<Trash2 size={16} />}
                    onClick={clearIcon}
                  >
                    {t("profile.removeIcon")}
                  </Button>
                )}
              </Stack>

              <Tabs
                value={tab}
                onChange={(_e, v: PickerTab) => setTab(v)}
                variant="fullWidth"
                sx={{ minHeight: 40 }}
              >
                <Tab value="emoji" label={t("profile.tabEmoji")} sx={{ minHeight: 40 }} />
                <Tab value="avatars" label={t("profile.tabAvatars")} sx={{ minHeight: 40 }} />
                <Tab value="photo" label={t("profile.tabPhoto")} sx={{ minHeight: 40 }} />
              </Tabs>

              {tab === "emoji" && (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {EMOJIS.map((emoji) => {
                    const selected = iconType === "emoji" && iconValue === emoji;
                    return (
                      <IconButton
                        key={emoji}
                        onClick={() => pickEmoji(emoji)}
                        sx={{
                          width: 48,
                          height: 48,
                          fontSize: 26,
                          borderRadius: 2,
                          border: "2px solid",
                          borderColor: selected ? "primary.main" : "divider",
                          bgcolor: selected ? "action.selected" : "transparent",
                        }}
                      >
                        {emoji}
                      </IconButton>
                    );
                  })}
                </Box>
              )}

              {tab === "avatars" && (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.25 }}>
                  {PRESET_AVATARS.map((p) => {
                    const selected = iconType === "preset" && iconValue === p.id;
                    return (
                      <Box
                        key={p.id}
                        component="button"
                        onClick={() => pickPreset(p.id)}
                        aria-label={p.id}
                        sx={{
                          p: 0.5,
                          lineHeight: 0,
                          cursor: "pointer",
                          borderRadius: "50%",
                          border: "2px solid",
                          borderColor: selected ? "primary.main" : "transparent",
                          bgcolor: "transparent",
                        }}
                      >
                        <PlayerAvatar
                          source={{ icon_type: "preset", icon_value: p.id }}
                          size={52}
                        />
                      </Box>
                    );
                  })}
                </Box>
              )}

              {tab === "photo" && (
                <Stack spacing={1.5} sx={{ alignItems: "flex-start" }}>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<Camera size={18} />}
                  >
                    {iconType === "image"
                      ? t("profile.changePhoto")
                      : t("profile.choosePhoto")}
                    <input
                      ref={fileInputRef}
                      hidden
                      type="file"
                      accept="image/*"
                      onChange={onFile}
                    />
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    {t("profile.photoHint")}
                  </Typography>
                </Stack>
              )}
            </Stack>

            <Divider />

            <Stack direction="row" spacing={1.5} sx={{ justifyContent: "flex-end" }}>
              <Button color="inherit" onClick={() => navigate("/")} disabled={saving}>
                {t("cancel")}
              </Button>
              <Button
                variant="contained"
                startIcon={<Check size={18} />}
                onClick={save}
                disabled={saving || !dirty || !displayName.trim()}
              >
                {t("save")}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        sx={{ bottom: { xs: 80, sm: 24 } }}
      >
        {toast ? (
          <Alert severity={toast.severity} onClose={() => setToast(null)} sx={{ width: "100%" }}>
            {toast.msg}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Stack>
  );
}
