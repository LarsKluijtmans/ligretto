"""API-level tests over the FastAPI app with a fake identity + temp SQLite DB:
provisioning, create-game bounds, round recompute, finish/winner, and isolation."""
from __future__ import annotations


def test_health(app_client):
    r = app_client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_me_provisions_player(app_client):
    r = app_client.get("/api/v1/me")
    assert r.status_code == 200
    body = r.json()
    assert body["sub"] == "user-alice"
    assert body["display_name"] == "user-alice"
    assert body["email"] == "user-alice@example.com"

    # Second call returns the same provisioned player (idempotent), not a duplicate.
    r2 = app_client.get("/api/v1/me")
    assert r2.status_code == 200
    assert r2.json()["sub"] == "user-alice"


def test_update_profile(app_client):
    app_client.get("/api/v1/me")
    r = app_client.patch("/api/v1/me/profile", json={"display_name": "Alice A."})
    assert r.status_code == 200
    assert r.json()["display_name"] == "Alice A."


def test_me_defaults_to_no_icon(app_client):
    body = app_client.get("/api/v1/me").json()
    assert body["icon_type"] == "none"
    assert body["icon_value"] is None
    assert body["avatar_data_url"] is None
    assert body["language"] is None


def test_update_profile_saves_language(app_client):
    app_client.get("/api/v1/me")
    r = app_client.patch("/api/v1/me/profile", json={"display_name": "Alice", "language": "nl"})
    assert r.status_code == 200
    assert r.json()["language"] == "nl"
    # Persisted across a fresh read.
    assert app_client.get("/api/v1/me").json()["language"] == "nl"


# --- Bolt 010: player directory (search + win rate) ---------------------------------------------

def test_player_search_finds_by_name_and_email_but_never_returns_email(app_client):
    app_client.get("/api/v1/me")  # provision alice
    app_client._set_user("user-bob")
    app_client.get("/api/v1/me")  # provision bob (email user-bob@example.com)
    app_client._set_user("user-alice")

    by_name = app_client.get("/api/v1/players/search", params={"q": "bob"})
    assert by_name.status_code == 200
    cards = by_name.json()
    bob = next((c for c in cards if c["id"] == "user-bob"), None)
    assert bob is not None
    assert "email" not in bob  # email is a search key, never returned
    assert bob["win_rate"] is None and bob["games_played"] == 0  # no games yet

    by_email = app_client.get("/api/v1/players/search", params={"q": "user-bob@example"})
    ids = [c["id"] for c in by_email.json()]
    assert "user-bob" in ids  # matched by email...
    assert all("email" not in c for c in by_email.json())  # ...but email never appears


def test_player_search_requires_min_query(app_client):
    app_client.get("/api/v1/me")
    assert app_client.get("/api/v1/players/search", params={"q": "a"}).json() == []
    assert app_client.get("/api/v1/players/search", params={"q": ""}).json() == []


def test_display_name_falls_back_to_email_prefix():
    from app.models import Player
    from app.services.player_directory_service import display_name_for

    assert display_name_for(Player(sub="s", display_name="Alice", email="alice@x.com")) == "Alice"
    # no display name -> local-part of the email
    assert display_name_for(Player(sub="s", display_name="", email="sam@example.com")) == "sam"
    # display name that is just the echoed email -> local-part
    assert display_name_for(Player(sub="s", display_name="kim@a.io", email="kim@a.io")) == "kim"
    # nothing usable -> generic label (never a raw email)
    assert display_name_for(Player(sub="s", display_name="", email=None)) == "Player"


# --- Bolt 011: game invitations (accept-required) ----------------------------------------------

def _provision(app_client, sub):
    app_client._set_user(sub)
    app_client.get("/api/v1/me")


def test_invite_accept_seats_grants_read_and_history(app_client, create_game_payload):
    app_client.get("/api/v1/me")  # alice hosts
    gid = app_client.post("/api/v1/games", json=create_game_payload()).json()["id"]
    _provision(app_client, "user-bob")  # bob exists as a player
    app_client._set_user("user-alice")

    r = app_client.post(f"/api/v1/games/{gid}/invitations", json={"invitee_id": "user-bob"})
    assert r.status_code == 201
    inv = r.json()
    assert inv["status"] == "pending"
    assert inv["invitee"]["id"] == "user-bob"
    assert "email" not in inv["invitee"]  # card never leaks email
    iid = inv["id"]
    assert any(i["id"] == iid for i in app_client.get(f"/api/v1/games/{gid}/invitations").json())

    # bob: sees the pending invite, but CANNOT read the game until he accepts
    app_client._set_user("user-bob")
    pend = app_client.get("/api/v1/invitations").json()
    assert len(pend) == 1 and pend[0]["game_id"] == gid and pend[0]["inviter"]["id"] == "user-alice"
    assert app_client.get(f"/api/v1/games/{gid}").status_code == 404

    # accept → seated as an account player, game readable, appears in bob's history
    assert app_client.post(f"/api/v1/invitations/{iid}/accept").status_code == 200
    detail = app_client.get(f"/api/v1/games/{gid}")
    assert detail.status_code == 200
    assert len(detail.json()["players"]) == 3  # 2 guests + bob
    assert any(g["id"] == gid for g in app_client.get("/api/v1/history").json())
    assert app_client.get("/api/v1/invitations").json() == []  # no longer pending


def test_invite_only_by_host(app_client, create_game_payload):
    app_client.get("/api/v1/me")
    gid = app_client.post("/api/v1/games", json=create_game_payload()).json()["id"]
    _provision(app_client, "user-bob")  # bob is now the caller (not the host)
    assert (
        app_client.post(f"/api/v1/games/{gid}/invitations", json={"invitee_id": "user-bob"}).status_code
        == 404
    )


def test_cannot_invite_the_same_player_twice(app_client, create_game_payload):
    app_client.get("/api/v1/me")
    gid = app_client.post("/api/v1/games", json=create_game_payload()).json()["id"]
    _provision(app_client, "user-bob")
    app_client._set_user("user-alice")
    assert app_client.post(f"/api/v1/games/{gid}/invitations", json={"invitee_id": "user-bob"}).status_code == 201
    assert app_client.post(f"/api/v1/games/{gid}/invitations", json={"invitee_id": "user-bob"}).status_code == 409


def test_decline_does_not_seat_or_grant_read(app_client, create_game_payload):
    app_client.get("/api/v1/me")
    gid = app_client.post("/api/v1/games", json=create_game_payload()).json()["id"]
    _provision(app_client, "user-carol")
    app_client._set_user("user-alice")
    iid = app_client.post(f"/api/v1/games/{gid}/invitations", json={"invitee_id": "user-carol"}).json()["id"]

    app_client._set_user("user-carol")
    assert app_client.post(f"/api/v1/invitations/{iid}/decline").status_code == 200
    assert app_client.get(f"/api/v1/games/{gid}").status_code == 404  # never seated
    app_client._set_user("user-alice")
    assert len(app_client.get(f"/api/v1/games/{gid}").json()["players"]) == 2  # unchanged


def test_win_rate_counts_a_tied_top_score_as_a_win():
    from app.models import Game, GamePlayer, RoundScore
    from app.services.stats_service import StatsService

    def seat(seat_id: int, pid: int, score: int) -> GamePlayer:
        gp = GamePlayer(
            id=seat_id, game_id=1, seat=seat_id, kind="account", player_id=pid, display_name="x"
        )
        gp.scores = [
            RoundScore(round_id=1, game_player_id=seat_id, centre_cards=0, stack_left=0, computed_score=score)
        ]
        return gp

    g_tie = Game(id=1, host_player_id=7, target_type="rounds", target_value=1, status="completed")
    g_tie.players = [seat(1, 7, 20), seat(2, 8, 20)]   # 7 ties for the top -> counts as a win
    g_loss = Game(id=2, host_player_id=7, target_type="rounds", target_value=1, status="completed")
    g_loss.players = [seat(3, 7, 10), seat(4, 9, 25)]  # 7 loses

    class FakeGames:
        def list_completed_seating(self, player_id: int):
            return [g for g in (g_tie, g_loss) if any(gp.player_id == player_id for gp in g.players)]

    played, wins, rate = StatsService(FakeGames()).win_rate_for(7)
    assert (played, wins, rate) == (2, 1, 0.5)


def test_update_profile_with_emoji(app_client):
    app_client.get("/api/v1/me")
    r = app_client.patch(
        "/api/v1/me/profile",
        json={"display_name": "Alice", "icon_type": "emoji", "icon_value": "🦊"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["icon_type"] == "emoji"
    assert body["icon_value"] == "🦊"
    assert body["avatar_data_url"] is None
    # Persisted across a fresh read.
    assert app_client.get("/api/v1/me").json()["icon_value"] == "🦊"


def test_update_profile_image_then_switch_clears_blob(app_client):
    app_client.get("/api/v1/me")
    data_url = (
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lE"
        "QVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    )
    r = app_client.patch(
        "/api/v1/me/profile",
        json={"display_name": "Alice", "icon_type": "image", "avatar_data_url": data_url},
    )
    assert r.status_code == 200
    assert r.json()["icon_type"] == "image"
    assert r.json()["avatar_data_url"] == data_url

    # Switching to an emoji clears the stored image so no stale blob lingers.
    r2 = app_client.patch(
        "/api/v1/me/profile",
        json={"display_name": "Alice", "icon_type": "emoji", "icon_value": "🐼"},
    )
    assert r2.status_code == 200
    assert r2.json()["icon_type"] == "emoji"
    assert r2.json()["avatar_data_url"] is None


def test_update_profile_rejects_bad_icon(app_client):
    app_client.get("/api/v1/me")
    # emoji type with no value
    assert (
        app_client.patch(
            "/api/v1/me/profile", json={"display_name": "A", "icon_type": "emoji"}
        ).status_code
        == 422
    )
    # image type with a non-image data url
    assert (
        app_client.patch(
            "/api/v1/me/profile",
            json={"display_name": "A", "icon_type": "image", "avatar_data_url": "notadataurl"},
        ).status_code
        == 422
    )


def test_create_game_allows_one_seated_but_scoring_needs_two(app_client, create_game_payload):
    # 0 players is still invalid
    assert app_client.post("/api/v1/games", json=create_game_payload(players=0)).status_code == 400
    # 1 seated player is now allowed — create solo, then invite the rest (accept-required)
    r = app_client.post("/api/v1/games", json=create_game_payload(players=1))
    assert r.status_code == 201
    gid = r.json()["id"]
    seat_id = r.json()["players"][0]["id"]
    # ...but you cannot SCORE until there are at least 2 players
    scored = app_client.post(
        f"/api/v1/games/{gid}/rounds", json={"scores": [{"game_player_id": seat_id, "net": 5}]}
    )
    assert scored.status_code == 400


def test_create_game_enforces_max_players(app_client, create_game_payload):
    r = app_client.post("/api/v1/games", json=create_game_payload(players=11))
    assert r.status_code == 400


def test_create_game_ok_and_listed(app_client, create_game_payload):
    r = app_client.post("/api/v1/games", json=create_game_payload(players=3))
    assert r.status_code == 201
    game = r.json()
    assert game["status"] == "active"
    assert len(game["players"]) == 3
    assert [p["seat"] for p in game["players"]] == [1, 2, 3]

    lst = app_client.get("/api/v1/games")
    assert lst.status_code == 200
    assert len(lst.json()) == 1
    assert lst.json()[0]["player_count"] == 3


def test_enter_round_recomputes_totals(app_client, create_game_payload):
    game = app_client.post("/api/v1/games", json=create_game_payload(players=2)).json()
    p1, p2 = game["players"][0]["id"], game["players"][1]["id"]

    r = app_client.post(
        f"/api/v1/games/{game['id']}/rounds",
        json={
            "scores": [
                {"game_player_id": p1, "centre_cards": 10, "stack_left": 1},  # 8
                {"game_player_id": p2, "centre_cards": 4, "stack_left": 3},   # -2
            ]
        },
    )
    assert r.status_code == 200
    detail = r.json()
    totals = {p["id"]: p["total"] for p in detail["players"]}
    assert totals[p1] == 8
    assert totals[p2] == -2
    assert detail["leader"] == [p1]
    assert detail["current_round"] if "current_round" in detail else True
    assert detail["rounds"][0]["number"] == 1


def test_net_entry_is_used_verbatim(app_client, create_game_payload):
    game = app_client.post("/api/v1/games", json=create_game_payload(players=2)).json()
    p1, p2 = game["players"][0]["id"], game["players"][1]["id"]
    r = app_client.post(
        f"/api/v1/games/{game['id']}/rounds",
        json={"scores": [
            {"game_player_id": p1, "net": 15},
            {"game_player_id": p2, "net": -4},
        ]},
    )
    assert r.status_code == 200
    totals = {p["id"]: p["total"] for p in r.json()["players"]}
    assert totals[p1] == 15 and totals[p2] == -4


def test_correct_round_replaces_scores(app_client, create_game_payload):
    game = app_client.post("/api/v1/games", json=create_game_payload(players=2)).json()
    p1, p2 = game["players"][0]["id"], game["players"][1]["id"]
    app_client.post(
        f"/api/v1/games/{game['id']}/rounds",
        json={"scores": [
            {"game_player_id": p1, "net": 5},
            {"game_player_id": p2, "net": 5},
        ]},
    )
    r = app_client.patch(
        f"/api/v1/games/{game['id']}/rounds/1",
        json={"scores": [
            {"game_player_id": p1, "net": 20},
            {"game_player_id": p2, "net": 1},
        ]},
    )
    assert r.status_code == 200
    totals = {p["id"]: p["total"] for p in r.json()["players"]}
    assert totals[p1] == 20 and totals[p2] == 1


def test_finish_sets_winner(app_client, create_game_payload):
    game = app_client.post(
        "/api/v1/games", json=create_game_payload(target_type="points", target_value=10, players=2)
    ).json()
    p1, p2 = game["players"][0]["id"], game["players"][1]["id"]
    app_client.post(
        f"/api/v1/games/{game['id']}/rounds",
        json={"scores": [
            {"game_player_id": p1, "net": 12},
            {"game_player_id": p2, "net": 3},
        ]},
    )
    r = app_client.post(f"/api/v1/games/{game['id']}/finish")
    assert r.status_code == 200
    detail = r.json()
    assert detail["status"] == "completed"
    assert detail["winner"] == p1
    assert detail["completed_at"] is not None


def test_finish_tie_has_no_single_winner(app_client, create_game_payload):
    game = app_client.post("/api/v1/games", json=create_game_payload(players=2)).json()
    p1, p2 = game["players"][0]["id"], game["players"][1]["id"]
    app_client.post(
        f"/api/v1/games/{game['id']}/rounds",
        json={"scores": [
            {"game_player_id": p1, "net": 7},
            {"game_player_id": p2, "net": 7},
        ]},
    )
    r = app_client.post(f"/api/v1/games/{game['id']}/finish")
    assert r.status_code == 200
    assert r.json()["winner"] is None


def test_abandon(app_client, create_game_payload):
    game = app_client.post("/api/v1/games", json=create_game_payload(players=2)).json()
    r = app_client.post(f"/api/v1/games/{game['id']}/abandon")
    assert r.status_code == 200
    assert r.json()["status"] == "abandoned"


def test_add_and_remove_player_before_scoring(app_client, create_game_payload):
    game = app_client.post("/api/v1/games", json=create_game_payload(players=2)).json()
    r = app_client.post(
        f"/api/v1/games/{game['id']}/players",
        json={"kind": "guest", "display_name": "Latecomer"},
    )
    assert r.status_code == 200
    assert len(r.json()["players"]) == 3
    new_id = [p for p in r.json()["players"] if p["display_name"] == "Latecomer"][0]["id"]

    r2 = app_client.delete(f"/api/v1/games/{game['id']}/players/{new_id}")
    assert r2.status_code == 200
    assert len(r2.json()["players"]) == 2


def test_cannot_add_player_after_round_scored(app_client, create_game_payload):
    game = app_client.post("/api/v1/games", json=create_game_payload(players=2)).json()
    p1, p2 = game["players"][0]["id"], game["players"][1]["id"]
    app_client.post(
        f"/api/v1/games/{game['id']}/rounds",
        json={"scores": [
            {"game_player_id": p1, "net": 1},
            {"game_player_id": p2, "net": 2},
        ]},
    )
    r = app_client.post(
        f"/api/v1/games/{game['id']}/players",
        json={"kind": "guest", "display_name": "TooLate"},
    )
    assert r.status_code == 409


def test_isolation_other_users_game_is_404(app_client, create_game_payload):
    # Alice creates a game.
    app_client._set_user("user-alice")
    game = app_client.post("/api/v1/games", json=create_game_payload(players=2)).json()
    gid = game["id"]

    # Bob cannot see it -> 404 (never 403).
    app_client._set_user("user-bob")
    r = app_client.get(f"/api/v1/games/{gid}")
    assert r.status_code == 404
    # Bob's list is empty.
    assert app_client.get("/api/v1/games").json() == []
    # Bob cannot score or finish it either.
    assert app_client.post(f"/api/v1/games/{gid}/finish").status_code == 404


def test_history_and_stats(app_client, create_game_payload):
    game = app_client.post(
        "/api/v1/games", json=create_game_payload(target_type="points", target_value=10, players=2)
    ).json()
    p1, p2 = game["players"][0]["id"], game["players"][1]["id"]
    app_client.post(
        f"/api/v1/games/{game['id']}/rounds",
        json={"scores": [{"game_player_id": p1, "net": 12}, {"game_player_id": p2, "net": 3}]},
    )
    app_client.post(f"/api/v1/games/{game['id']}/finish")

    h = app_client.get("/api/v1/history?limit=10&offset=0")
    assert h.status_code == 200
    assert len(h.json()) == 1

    s = app_client.get("/api/v1/stats/me")
    assert s.status_code == 200
    body = s.json()
    assert body["games_played"] == 1
    assert set(body.keys()) == {"games_played", "wins", "win_rate", "avg_score", "best_round"}
