// Typed client for the Ligretto backend (FastAPI, base = VITE_BACKEND_URL, prefix /api/v1).
// Every call carries the signed-in user's access token (from react-auth's getAccessToken, which
// refreshes it transparently). The SCORING is server-computed — we send counts, never a total we
// trust; computed_score comes back from the server.
import { env } from "../env";

// ---------------------------------------------------------------------------------------------
// Shared enums / literals (match the SQLAlchemy models in the contract)
// ---------------------------------------------------------------------------------------------
export type TargetType = "rounds" | "points";
export type GameStatus = "active" | "completed" | "abandoned";
export type PlayerKind = "account" | "guest";

// ---------------------------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------------------------
export type IconType = "none" | "emoji" | "preset" | "image";

export type Me = {
  sub: string;
  display_name: string | null;
  email: string | null;
  icon_type: IconType;
  icon_value: string | null;
  avatar_data_url: string | null;
  language: string | null;
};

// A profile edit. For icon_type "emoji"/"preset" send icon_value; for "image" send avatar_data_url
// (a client-resized data URL); "none" clears the icon. `language` is the saved UI language (e.g. "en").
export type ProfileUpdate = {
  display_name: string;
  icon_type: IconType;
  icon_value?: string | null;
  avatar_data_url?: string | null;
  language?: string | null;
};

// A searchable player's PUBLIC card (from /players/search) — name + icon + win rate, never email.
// `id` is the player's stable public id (used to invite them once invitations land, bolt 011/012).
export type PlayerCardData = {
  id: string;
  display_name: string;
  icon_type: IconType;
  icon_value: string | null;
  avatar_data_url: string | null;
  win_rate: number | null; // null when they have no scored completed games
  games_played: number;
};

export type InvitationStatus = "pending" | "accepted" | "declined" | "cancelled";

// Host's view of an invitation for their game.
export type GameInvitation = {
  id: number;
  status: InvitationStatus;
  created_at: string;
  invitee: PlayerCardData;
};

// Invitee's view of a pending invitation (no scores).
export type PendingInvite = {
  id: number;
  game_id: number;
  game_name: string | null;
  inviter: PlayerCardData;
  created_at: string;
};

export type GameListItem = {
  id: string;
  name: string | null;
  status: GameStatus;
  target_type: TargetType;
  target_value: number;
  player_count: number;
  current_round: number;
  leader_name?: string | null;
  created_at: string;
};

export type GamePlayerView = {
  id: string;
  seat: number;
  display_name: string;
  total: number;
};

export type RoundScoreView = {
  game_player_id: string;
  centre_cards: number;
  stack_left: number;
  computed_score: number;
};

export type RoundView = {
  number: number;
  scores: RoundScoreView[];
};

export type GameDetail = {
  id: string;
  name: string | null;
  status: GameStatus;
  target_type: TargetType;
  target_value: number;
  players: GamePlayerView[];
  rounds: RoundView[];
  // The backend may echo a resolved leader / winner; we also derive the leader client-side for
  // highlighting so the board is robust regardless of the exact field shape.
  leader?: string | null;
  winner?: string | null;
  created_at?: string;
  completed_at?: string | null;
};

export type MyStats = {
  games_played: number;
  wins: number;
  win_rate: number;
  avg_score: number;
  best_round: number;
};

// ---------------------------------------------------------------------------------------------
// Request shapes
// ---------------------------------------------------------------------------------------------
export type NewPlayerInput = { kind: PlayerKind; display_name: string };

export type CreateGameInput = {
  name?: string;
  target_type: TargetType;
  target_value: number;
  players: NewPlayerInput[];
};

// A round score entry: either the two counts (server computes) or a direct net.
export type RoundScoreInput =
  | { game_player_id: string; centre_cards: number; stack_left: number }
  | { game_player_id: string; net: number };

export type SubmitRoundInput = { scores: RoundScoreInput[] };

// ---------------------------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------------------------
export type TokenGetter = () => Promise<string | null>;

async function request<T>(
  path: string,
  getToken: TokenGetter,
  init?: RequestInit,
): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${env.backendUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    let detail = "";
    try {
      const body = (await res.json()) as { detail?: unknown };
      if (body && typeof body.detail === "string") detail = `: ${body.detail}`;
    } catch {
      /* non-JSON error body — ignore */
    }
    throw new Error(`${init?.method ?? "GET"} ${path} → ${res.status}${detail}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------------------------
export const api = {
  // Identity — provisions a player row on first call, keyed by sub.
  getMe: (getToken: TokenGetter) => request<Me>("/api/v1/me", getToken),

  updateProfile: (getToken: TokenGetter, update: ProfileUpdate) =>
    request<Me>("/api/v1/me/profile", getToken, {
      method: "PATCH",
      body: JSON.stringify(update),
    }),

  // Search existing Ligretto players by name or email (min 2 chars, capped). Never returns email.
  searchPlayers: (getToken: TokenGetter, q: string) =>
    request<PlayerCardData[]>(`/api/v1/players/search?q=${encodeURIComponent(q)}`, getToken),

  // Invitations — host side (scoped to their game)
  invitePlayer: (getToken: TokenGetter, gameId: string, inviteeId: string) =>
    request<GameInvitation>(`/api/v1/games/${gameId}/invitations`, getToken, {
      method: "POST",
      body: JSON.stringify({ invitee_id: inviteeId }),
    }),
  listGameInvitations: (getToken: TokenGetter, gameId: string) =>
    request<GameInvitation[]>(`/api/v1/games/${gameId}/invitations`, getToken),
  cancelInvitation: (getToken: TokenGetter, gameId: string, invitationId: number) =>
    request<void>(`/api/v1/games/${gameId}/invitations/${invitationId}`, getToken, {
      method: "DELETE",
    }),

  // Invitations — invitee side
  myInvitations: (getToken: TokenGetter) =>
    request<PendingInvite[]>("/api/v1/invitations", getToken),
  acceptInvitation: (getToken: TokenGetter, invitationId: number) =>
    request<void>(`/api/v1/invitations/${invitationId}/accept`, getToken, { method: "POST" }),
  declineInvitation: (getToken: TokenGetter, invitationId: number) =>
    request<void>(`/api/v1/invitations/${invitationId}/decline`, getToken, { method: "POST" }),

  // Games
  listGames: (getToken: TokenGetter) => request<GameListItem[]>("/api/v1/games", getToken),

  createGame: (getToken: TokenGetter, input: CreateGameInput) =>
    request<GameDetail>("/api/v1/games", getToken, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  getGame: (getToken: TokenGetter, id: string) =>
    request<GameDetail>(`/api/v1/games/${id}`, getToken),

  addPlayer: (getToken: TokenGetter, id: string, player: NewPlayerInput) =>
    request<GameDetail>(`/api/v1/games/${id}/players`, getToken, {
      method: "POST",
      body: JSON.stringify(player),
    }),

  removePlayer: (getToken: TokenGetter, id: string, gamePlayerId: string) =>
    request<void>(`/api/v1/games/${id}/players/${gamePlayerId}`, getToken, {
      method: "DELETE",
    }),

  submitRound: (getToken: TokenGetter, id: string, input: SubmitRoundInput) =>
    request<GameDetail>(`/api/v1/games/${id}/rounds`, getToken, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  updateRound: (getToken: TokenGetter, id: string, number: number, input: SubmitRoundInput) =>
    request<GameDetail>(`/api/v1/games/${id}/rounds/${number}`, getToken, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  finishGame: (getToken: TokenGetter, id: string) =>
    request<GameDetail>(`/api/v1/games/${id}/finish`, getToken, { method: "POST" }),

  abandonGame: (getToken: TokenGetter, id: string) =>
    request<GameDetail>(`/api/v1/games/${id}/abandon`, getToken, { method: "POST" }),

  // History + stats
  history: (getToken: TokenGetter, limit = 50, offset = 0) =>
    request<GameListItem[]>(`/api/v1/history?limit=${limit}&offset=${offset}`, getToken),

  myStats: (getToken: TokenGetter) => request<MyStats>("/api/v1/stats/me", getToken),
};

// ---------------------------------------------------------------------------------------------
// Client-side helpers (pure)
// ---------------------------------------------------------------------------------------------
// round_score = centre_cards - 2*stack_left — mirrors the server engine so the entry form can
// preview a live score. The server value (computed_score) is always authoritative.
export function previewScore(centreCards: number, stackLeft: number): number {
  return centreCards - 2 * stackLeft;
}

// Leader(s) = the game_player id(s) with the max total. Ties allowed (returns all).
export function leaderIds(players: GamePlayerView[]): string[] {
  if (players.length === 0) return [];
  const max = Math.max(...players.map((p) => p.total));
  return players.filter((p) => p.total === max).map((p) => p.id);
}

// Whether the target has been reached (client-side hint for the finish prompt).
export function targetReached(game: {
  target_type: TargetType;
  target_value: number;
  players: GamePlayerView[];
  rounds: RoundView[];
}): boolean {
  if (game.target_type === "rounds") return game.rounds.length >= game.target_value;
  return game.players.some((p) => p.total >= game.target_value);
}
