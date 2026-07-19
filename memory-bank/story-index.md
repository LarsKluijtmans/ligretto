# Story Index — ligretto-scorekeeper

Global index (single-file mode). Intent **001-ligretto-scorekeeper**. Status legend: ⬜ planned.

| Story | Unit | Bolt | Summary | Status |
|---|---|---|---|---|
| S-001-1 | 001 app-foundation | 001 | Scaffold frontend + backend + Docker + dev run | ⬜ |
| S-001-2 | 001 app-foundation | 001 | Embedded react-login PKCE sign-in | ⬜ |
| S-001-3 | 001 app-foundation | 001 | Backend JWKS JWT-validation + `/me` | ⬜ |
| S-001-4 | 001 app-foundation | 001 | Player provisioning + profile | ⬜ |
| S-001-5 | 001 app-foundation | 001 | App shell + i18n (EN/NL) + theme | ⬜ |
| S-002-1 | 002 rules | 002 | Curated Ligretto rules page (EN/NL) | ⬜ |
| S-003-1 | 003 game-lifecycle | 003 | Game domain + create | ⬜ |
| S-003-2 | 003 game-lifecycle | 003 | Manage players (2–10; accounts + guests) | ⬜ |
| S-003-3 | 003 game-lifecycle | 003 | My games + game-setup UI | ⬜ |
| S-003-4 | 003 game-lifecycle | 003 | Finish / abandon a game | ⬜ |
| S-004-1 | 004 scoring | 004 | Scoring engine + round domain | ⬜ |
| S-004-2 | 004 scoring | 004 | Enter + correct a round | ⬜ |
| S-004-3 | 004 scoring | 005 | Scoreboard + round-entry UI | ⬜ |
| S-004-4 | 004 scoring | 005 | Game-end prompt | ⬜ |
| S-005-1 | 005 history-and-stats | 006 | History APIs | ⬜ |
| S-005-2 | 005 history-and-stats | 006 | History UI | ⬜ |
| S-005-3 | 005 history-and-stats | 006 | Player stats (secondary) | ⬜ |
| S-006-1 | 006 mobile-app | 007 | Mobile scaffold + auth + shell (Expo/RN) | ⬜ |
| S-006-2 | 006 mobile-app | 008 | Rules + games (mobile) | ⬜ |
| S-006-3 | 006 mobile-app | 008 | Scoreboard + round entry (mobile) | ⬜ |
| S-006-4 | 006 mobile-app | 009 | History + stats (mobile) | ⬜ |

**Intent 001 totals:** 6 units · 21 stories · 9 bolts. (Backend + web = bolts 001–006; mobile = bolts 007–009.)

---

Intent **002-player-invites-and-stats**. Status legend: ⬜ planned · ✅ done.

| Story | Unit | Bolt | Summary | Status |
|---|---|---|---|---|
| S-007-1 | 007 player-directory-and-stats | 010 | Player search API (name/email; no email returned) | ✅ |
| S-007-2 | 007 player-directory-and-stats | 010 | Win-rate + public player stats | ✅ |
| S-007-3 | 007 player-directory-and-stats | 010 | Player card + search UI (web) | ✅ |
| S-008-1 | 008 game-invitations | 011 | Invitation domain + host actions | ⬜ |
| S-008-2 | 008 game-invitations | 011 | Invitee accept / decline | ⬜ |
| S-008-3 | 008 game-invitations | 011 | Consent-safe stats + history wiring | ⬜ |
| S-008-4 | 008 game-invitations | 012 | Invite + pending-invites UI (web) | ⬜ |
| S-010-1 | 010 realtime-invite-notifications | 014 | Backend SSE event stream + publish on invite | ⬜ |
| S-010-3 | 010 realtime-invite-notifications | 014 | Away push + email on invite (notification-api) | ⬜ |
| S-010-2 | 010 realtime-invite-notifications | 015 | Web live toast + pending-invites badge | ⬜ |
| S-009-1 | 009 mobile-invites-and-stats | 013 | Mobile search + invite *(optional)* | ⬜ |
| S-009-2 | 009 mobile-invites-and-stats | 013 | Mobile pending-invites + accept/decline *(optional)* | ⬜ |

**Intent 002 totals:** 4 units · 12 stories · 6 bolts (010–015; bolt 013 mobile is optional parity).

