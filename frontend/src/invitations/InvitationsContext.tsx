import { useAuth } from "@lars-kluijtmans/react-auth";
import { Alert, Snackbar } from "@mui/material";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api/backend";
import type { PendingInvite } from "../api/backend";
import { env } from "../env";

// The signed-in user's PENDING game invitations, for the bell badge + list. Loaded once, then kept
// LIVE (bolt 015): a fetch-stream to /events (SSE, Bearer via header) pops a toast + bumps the badge
// the instant someone invites you — no refresh. The stream is a convenience over the authoritative
// list, so on any drop/reconnect we re-pull to reconcile.
type Ctx = {
  invites: PendingInvite[];
  loading: boolean;
  refresh: () => void;
  // Subscribe to live "this game changed" pushes (round scored, player joined, finished). Returns an
  // unsubscribe. Used by the game page so scores update in real time for every participant.
  subscribeGame: (gameId: number, cb: () => void) => () => void;
};

const InvitationsCtx = createContext<Ctx | null>(null);
const RECONNECT_MS = 3000;

export function InvitationsProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation("app");
  const { getAccessToken } = useAuth();
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  // Per-game "changed" listeners (the game page registers one to reload live).
  const gameListeners = useRef(new Map<number, Set<() => void>>());
  const subscribeGame = useCallback((gameId: number, cb: () => void) => {
    let set = gameListeners.current.get(gameId);
    if (!set) {
      set = new Set();
      gameListeners.current.set(gameId, set);
    }
    set.add(cb);
    return () => {
      const s = gameListeners.current.get(gameId);
      if (s) {
        s.delete(cb);
        if (!s.size) gameListeners.current.delete(gameId);
      }
    };
  }, []);

  // keep the latest token getter without re-running the stream effect
  const tokenRef = useRef(getAccessToken);
  tokenRef.current = getAccessToken;

  useEffect(() => {
    let active = true;
    api
      .myInvitations(getAccessToken)
      .then((r) => {
        if (active) setInvites(r);
      })
      .catch(() => {
        if (active) setInvites([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [getAccessToken, nonce]);

  // Live stream — runs once for the authenticated session; reconnects on drop.
  useEffect(() => {
    let stopped = false;
    let controller: AbortController | null = null;

    async function run() {
      while (!stopped) {
        controller = new AbortController();
        try {
          const token = await tokenRef.current();
          const res = await fetch(`${env.backendUrl}/api/v1/events`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            signal: controller.signal,
          });
          if (!res.ok || !res.body) throw new Error("stream unavailable");
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buf = "";
          while (!stopped) {
            const { value, done } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const frames = buf.split("\n\n");
            buf = frames.pop() ?? "";
            for (const frame of frames) {
              const dataLine = frame.split("\n").find((l) => l.startsWith("data:"));
              if (!dataLine) continue;
              try {
                const evt = JSON.parse(dataLine.slice(5).trim());
                if (evt.type === "invitation.created") {
                  setNonce((n) => n + 1); // re-pull the authoritative list (badge bumps)
                  setToast(evt.inviter_name || t("invites.someone"));
                } else if (evt.type === "game.updated") {
                  gameListeners.current.get(evt.game_id)?.forEach((fn) => fn());
                }
              } catch {
                /* ignore malformed frame */
              }
            }
          }
        } catch {
          /* connection dropped or aborted */
        }
        if (stopped) break;
        await new Promise((r) => setTimeout(r, RECONNECT_MS));
        setNonce((n) => n + 1); // reconcile the badge on reconnect
      }
    }

    void run();
    return () => {
      stopped = true;
      controller?.abort();
    };
  }, [t]);

  const value = useMemo<Ctx>(
    () => ({ invites, loading, refresh, subscribeGame }),
    [invites, loading, refresh, subscribeGame],
  );

  return (
    <InvitationsCtx.Provider value={value}>
      {children}
      <Snackbar
        open={!!toast}
        autoHideDuration={6000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        sx={{ bottom: { xs: 80, sm: 24 } }}
      >
        {toast ? (
          <Alert severity="info" onClose={() => setToast(null)} sx={{ width: "100%" }}>
            {t("invites.liveToast", { name: toast })}
          </Alert>
        ) : undefined}
      </Snackbar>
    </InvitationsCtx.Provider>
  );
}

export function useInvitations(): Ctx {
  const ctx = useContext(InvitationsCtx);
  if (!ctx) throw new Error("useInvitations must be used within an InvitationsProvider");
  return ctx;
}
