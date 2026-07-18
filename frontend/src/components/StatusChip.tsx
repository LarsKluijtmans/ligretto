import { Chip } from "@mui/material";
import { useTranslation } from "react-i18next";
import type { GameStatus } from "../api/backend";

const COLOR: Record<GameStatus, "success" | "default" | "warning"> = {
  active: "success",
  completed: "default",
  abandoned: "warning",
};

export function StatusChip({ status }: { status: GameStatus }) {
  const { t } = useTranslation("app");
  return <Chip size="small" color={COLOR[status]} label={t(`status.${status}`)} />;
}
