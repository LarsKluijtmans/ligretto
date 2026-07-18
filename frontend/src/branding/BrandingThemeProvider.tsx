// Fetches the project's branding once on mount and themes the WHOLE app with it — not just the
// login form. We reuse react-login's themeFromBranding so the app shell and the login UI share
// one look. logoUrl / backgroundUrl are exposed via context for the chrome to use.
import { createAuthClient } from "@lars-kluijtmans/react-auth";
import type { Branding } from "@lars-kluijtmans/react-auth";
import { themeFromBranding } from "@lars-kluijtmans/react-login";
import { CssBaseline, ThemeProvider } from "@mui/material";
import type { Theme } from "@mui/material";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { authConfig } from "../authConfig";
import { ligrettoTheme } from "../theme/ligrettoTheme";

type BrandingContextValue = { branding: Branding; loading: boolean };

const BrandingContext = createContext<BrandingContextValue>({ branding: {}, loading: true });

export const useBranding = (): BrandingContextValue => useContext(BrandingContext);

export function BrandingThemeProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<Branding>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const client = createAuthClient({
      authApiUrl: authConfig.authApiUrl,
      clientId: authConfig.clientId,
      redirectUri: authConfig.redirectUri,
    });
    client
      .fetchBranding()
      .then((b) => {
        if (active) setBranding(b);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // themeFromBranding comes from react-login's bundled MUI copy; cast it to this app's Theme type
  // (identical runtime shape) so our ThemeProvider accepts it.
  const theme = useMemo<Theme>(
    () =>
      Object.keys(branding).length > 0
        ? (themeFromBranding(branding) as unknown as Theme)
        : ligrettoTheme,
    [branding],
  );

  return (
    <BrandingContext.Provider value={{ branding, loading }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </BrandingContext.Provider>
  );
}
