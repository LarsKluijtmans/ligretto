import { Avatar } from "@mui/material";
import type { SxProps, Theme } from "@mui/material";
import type { IconType } from "../api/backend";
import { PRESET_BY_ID } from "./avatars";

// One place that turns an icon (type + value + optional uploaded image) into a rendered <Avatar>.
// Used by the profile page (live preview + pickers) and the app bar, so every surface shows the
// same thing. `preview` overrides let the profile page reflect unsaved edits.
export type AvatarSource = {
  icon_type: IconType;
  icon_value?: string | null;
  avatar_data_url?: string | null;
  display_name?: string | null;
};

export function PlayerAvatar({
  source,
  size = 40,
  sx,
}: {
  source: AvatarSource;
  size?: number;
  sx?: SxProps<Theme>;
}) {
  // Merge via the array form — `sx` may be an object, array, or function, so it can't be spread.
  const compose = (extra?: Record<string, unknown>): SxProps<Theme> =>
    [
      { width: size, height: size, fontWeight: 800, bgcolor: "secondary.main" },
      extra,
      ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
    ].filter(Boolean) as SxProps<Theme>;

  if (source.icon_type === "image" && source.avatar_data_url) {
    return <Avatar src={source.avatar_data_url} alt="" sx={compose()} />;
  }
  if (source.icon_type === "preset" && source.icon_value && PRESET_BY_ID[source.icon_value]) {
    return <Avatar src={PRESET_BY_ID[source.icon_value]} alt="" sx={compose()} />;
  }
  if (source.icon_type === "emoji" && source.icon_value) {
    return (
      <Avatar sx={compose({ fontSize: size * 0.58, bgcolor: "action.hover" })}>
        {source.icon_value}
      </Avatar>
    );
  }
  // Fallback: first letter of the display name (or "?").
  const letter = (source.display_name || "?").trim().charAt(0).toUpperCase() || "?";
  return <Avatar sx={compose()}>{letter}</Avatar>;
}
