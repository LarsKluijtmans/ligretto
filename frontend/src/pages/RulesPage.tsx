import { Box, Card, CardContent, Divider, Stack, Typography } from "@mui/material";
import { Calculator } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LIGRETTO_COLORS } from "../theme/ligrettoTheme";

type Section = { heading: string; items: string[] };

export function RulesPage() {
  const { t } = useTranslation("app");
  // Structured, localized content (arrays live in the locale files).
  const sections = t("rules.sections", { returnObjects: true }) as Section[];
  const deckColors = Object.values(LIGRETTO_COLORS);

  return (
    <Stack spacing={2.5}>
      <Box>
        <Stack direction="row" spacing={0.75} sx={{ mb: 1 }}>
          {deckColors.map((c) => (
            <Box key={c} sx={{ width: 28, height: 40, borderRadius: 1.5, bgcolor: c }} />
          ))}
        </Stack>
        <Typography variant="h4">{t("rules.title")}</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
          {t("rules.intro")}
        </Typography>
      </Box>

      {sections.map((section) => (
        <Card key={section.heading}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {section.heading}
            </Typography>
            <Stack component="ul" spacing={1} sx={{ pl: 3, my: 0 }}>
              {section.items.map((item, i) => (
                <Typography key={i} component="li" variant="body2">
                  {item}
                </Typography>
              ))}
            </Stack>
          </CardContent>
        </Card>
      ))}

      <Card sx={{ borderColor: "primary.main" }}>
        <CardContent>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
            <Calculator size={18} />
            <Typography variant="h6">{t("rules.scoringExampleTitle")}</Typography>
          </Stack>
          <Box
            sx={{
              fontFamily: "monospace",
              fontSize: 18,
              fontWeight: 700,
              color: "primary.main",
              my: 1,
            }}
          >
            centre − 2 × stack
          </Box>
          <Divider sx={{ my: 1 }} />
          <Typography variant="body2">{t("rules.scoringExample")}</Typography>
        </CardContent>
      </Card>
    </Stack>
  );
}
