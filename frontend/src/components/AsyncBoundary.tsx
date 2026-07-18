import { Alert, Box, Button, CircularProgress, Stack } from "@mui/material";
import { RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

// Renders a spinner while loading, an error alert (with retry) on failure, otherwise the children.
export function AsyncBoundary({
  loading,
  error,
  onRetry,
  children,
}: {
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation("app");

  if (loading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (error) {
    return (
      <Stack spacing={2} sx={{ py: 4, alignItems: "flex-start" }}>
        <Alert severity="error" sx={{ width: "100%" }}>
          {t("loadError")}: {error}
        </Alert>
        {onRetry && (
          <Button startIcon={<RefreshCw size={16} />} onClick={onRetry}>
            {t("retry")}
          </Button>
        )}
      </Stack>
    );
  }
  return <>{children}</>;
}
