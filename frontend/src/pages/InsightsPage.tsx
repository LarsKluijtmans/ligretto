import { useAuth } from "@lars-kluijtmans/react-auth";
import { alpha, Box, Card, CardContent, Stack, Typography, useTheme } from "@mui/material";
import { Ban, Gamepad2, PlayCircle, Trophy } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api/backend";
import type { AdminUsage } from "../api/backend";
import { AsyncBoundary } from "../components/AsyncBoundary";
import { useAsync } from "../hooks/useAsync";

// Admin-only "Insights" tab: app-wide game-lifecycle counts, read back from the platform's usage
// stream (the game controllers feed it on create/finish/abandon). Gated by the `admin` claim — the
// tab is hidden for non-admins and the endpoint 403s, so this page assumes an admin caller.
export function InsightsPage() {
  const { t } = useTranslation("app");
  const { getAccessToken } = useAuth();
  const load = useCallback(() => api.adminUsage(getAccessToken), [getAccessToken]);
  const { data, error, loading, reload } = useAsync<AdminUsage>(load);

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h4">{t("insights.title")}</Typography>
        <Typography variant="body2" color="text.secondary">
          {t("insights.subtitle")}
        </Typography>
      </Box>

      <AsyncBoundary loading={loading} error={error} onRetry={reload}>
        {data && <Insights data={data} />}
      </AsyncBoundary>
    </Stack>
  );
}

function Insights({ data }: { data: AdminUsage }) {
  const { t } = useTranslation("app");
  const theme = useTheme();

  if (!data.available) {
    return (
      <Card>
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            {t("insights.unavailable")}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const ended = data.finished + data.abandoned;
  const finishRate = ended > 0 ? Math.round((data.finished / ended) * 100) : null;

  return (
    <Stack spacing={2}>
      <Box
        sx={{
          display: "grid",
          gap: 1.5,
          gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" },
        }}
      >
        <Metric
          icon={<Gamepad2 size={22} />}
          color={theme.palette.secondary.main}
          value={data.created}
          label={t("insights.created")}
        />
        <Metric
          icon={<PlayCircle size={22} />}
          color={theme.palette.warning.main}
          value={data.in_progress}
          label={t("insights.inProgress")}
        />
        <Metric
          icon={<Trophy size={22} />}
          color={theme.palette.success.main}
          value={data.finished}
          label={t("insights.finished")}
        />
        <Metric
          icon={<Ban size={22} />}
          color={theme.palette.primary.main}
          value={data.abandoned}
          label={t("insights.abandoned")}
        />
      </Box>

      {finishRate !== null && (
        <Card>
          <CardContent>
            <Stack direction="row" sx={{ alignItems: "baseline", justifyContent: "space-between" }}>
              <Typography variant="body2" color="text.secondary">
                {t("insights.finishRate")}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                {finishRate}%
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      )}

      <Typography variant="caption" color="text.secondary">
        {t("insights.source")}
      </Typography>
    </Stack>
  );
}

function Metric({
  icon,
  color,
  value,
  label,
}: {
  icon: ReactNode;
  color: string;
  value: number;
  label: string;
}) {
  return (
    <Card sx={{ overflow: "hidden" }}>
      <CardContent sx={{ textAlign: "center", py: 2.5 }}>
        <Box
          sx={{
            width: 46,
            height: 46,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            mx: "auto",
            mb: 1,
            color,
            bgcolor: alpha(color, 0.14),
          }}
        >
          {icon}
        </Box>
        <Typography sx={{ fontWeight: 800, fontSize: "1.9rem", lineHeight: 1 }}>{value}</Typography>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
      </CardContent>
    </Card>
  );
}
