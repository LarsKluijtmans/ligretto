import type { AuthProviderConfig } from "@lars-kluijtmans/react-auth";
import { localStorageStorage } from "@lars-kluijtmans/react-auth";
import { env } from "./env";

// Embedded login: we deliberately DON'T set `hostedLoginUrl`. <LoginForm> renders the login UI
// in-app and completes the session via useAuth().completeLogin — no redirect to a portal.
export const authConfig: AuthProviderConfig = {
  authApiUrl: env.loginApiUrl,
  clientId: env.clientId,
  redirectUri: env.redirectUri,
  scope: "openid profile email",
  // Persist the session across reloads: the SDK keeps the refresh token in localStorage and restores +
  // refreshes it on load, so a reload (or coming back later) no longer forces a re-login. Tradeoff vs
  // the in-memory default — localStorage is more exposed to XSS — but it's the right call for this app
  // (and the app is CSP-locked); the refresh token still expires server-side (7 days).
  storage: localStorageStorage(),
};
