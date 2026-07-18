import { useAuth } from "@lars-kluijtmans/react-auth";
import { LoginForm } from "@lars-kluijtmans/react-login";
import { Box, CircularProgress } from "@mui/material";
import { BrowserRouter } from "react-router-dom";
import { authConfig } from "../authConfig";
import { useBranding } from "../branding/BrandingThemeProvider";
import { AppRoutes } from "../routes/AppRoutes";

// Decides what to render based on auth state: a spinner while resolving, the embedded
// <LoginForm> when signed out, and the app shell when signed in.
export function Gate() {
  const { isAuthenticated, isLoading, completeLogin } = useAuth();
  const { branding } = useBranding();

  if (isLoading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: "100vh", p: 2 }}>
        <Box sx={{ width: "100%", maxWidth: 420 }}>
          {/* Embedded flow: <LoginForm> generates its own PKCE and hands us back the code,
              which we finish via react-auth's completeLogin — no redirect to a portal. */}
          <LoginForm
            config={authConfig}
            branding={branding}
            onCode={(code, verifier) => completeLogin(code, verifier)}
            onAuthenticated={() => undefined}
          />
        </Box>
      </Box>
    );
  }

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
