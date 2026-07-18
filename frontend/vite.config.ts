import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Dev server runs on http://localhost:5173. The redirect URI you register on the login client
// (and the project's allowed origin) must match this origin — change both together if you move it.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  // The SDKs (@lars-kluijtmans/react-auth + react-login) are linked via `file:` and resolve as
  // SYMLINKS into the ../../auth monorepo, which has its OWN node_modules. Without dedupe, a bare
  // `react-i18next` / `i18next` import inside the linked LoginForm resolves to auth's copy instead of
  // this app's, creating a SECOND i18next instance -> react-i18next logs NO_I18NEXT_INSTANCE and the
  // login form renders raw keys (field.password, action.signIn, ...). Pin these singletons — plus
  // react itself, shared through react-auth's context — to this app's single copy.
  resolve: {
    dedupe: ["react", "react-dom", "react-i18next", "i18next"],
  },
});
