import { useAuth } from "@lars-kluijtmans/react-auth";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { api } from "../api/backend";
import type { Me } from "../api/backend";
import i18n from "../i18n";

// Loads the signed-in player's profile (`GET /me`, which also provisions the row) once for the
// authenticated app, and exposes it plus a way to update it. The app bar reads it for the avatar;
// the profile page reads it for initial values and writes it back after a save, so both stay in sync
// without a refetch.
type ProfileCtx = {
  me: Me | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  setMe: (me: Me) => void;
};

const Ctx = createContext<ProfileCtx | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { getAccessToken } = useAuth();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api
      .getMe(getAccessToken)
      .then((data) => {
        if (!active) return;
        setMe(data);
        // Apply the saved UI language so it follows the user across devices (overrides the
        // browser/localStorage detection only when a preference was actually saved).
        if (data.language && data.language !== i18n.resolvedLanguage) {
          void i18n.changeLanguage(data.language);
        }
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [getAccessToken, nonce]);

  const value = useMemo<ProfileCtx>(
    () => ({ me, loading, error, reload, setMe }),
    [me, loading, error, reload],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProfile(): ProfileCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProfile must be used within a ProfileProvider");
  return ctx;
}
