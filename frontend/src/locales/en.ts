export const en = {
  app: {
    title: "Ligretto",
    tagline: "Scorekeeper",
    logout: "Log out",
    language: "Language",
    loadError: "Something went wrong",
    retry: "Retry",
    cancel: "Cancel",
    save: "Save",
    back: "Back",
    loading: "Loading…",

    nav: {
      dashboard: "Games",
      rules: "Rules",
      history: "History",
    },

    menu: {
      account: "Account",
    },

    players: {
      findTitle: "Find players",
      findHint: "Search other Ligretto players by name or email.",
      searchLabel: "Search players",
      searchPlaceholder: "Name or email…",
      noResults: "No players found.",
      winRate: "{{pct}}% wins",
      noGames: "No games yet",
    },

    dashboard: {
      title: "My games",
      subtitle: "Games you host",
      newGame: "New game",
      empty: "No games yet. Start your first one!",
      emptyCta: "New game",
      round: "Round {{n}}",
      players_one: "{{count}} player",
      players_other: "{{count}} players",
      leader: "Leader: {{name}}",
      noLeader: "No scores yet",
      open: "Open",
      target_rounds: "First to {{n}} rounds",
      target_points: "Race to {{n}} points",
    },

    status: {
      active: "Active",
      completed: "Completed",
      abandoned: "Abandoned",
    },

    newGame: {
      title: "New game",
      nameLabel: "Game name (optional)",
      namePlaceholder: "Friday night Ligretto",
      targetLabel: "Play to",
      targetRounds: "A number of rounds",
      targetPoints: "A points total",
      targetValueRounds: "Rounds",
      targetValuePoints: "Target points",
      players: "Players",
      playersHint: "Add 2 to 10 players.",
      addMe: "Add me",
      addGuest: "Add guest",
      guestName: "Guest name",
      you: "You",
      seat: "Seat {{n}}",
      remove: "Remove",
      create: "Create game",
      needTwo: "Add at least 2 players.",
      tooMany: "A game can have at most 10 players.",
      meAlready: "You are already in this game.",
    },

    game: {
      round: "Round {{n}}",
      rounds: "Rounds",
      total: "Total",
      standings: "Standings",
      leader: "Leader",
      winner: "Winner",
      noRounds: "No rounds scored yet. Enter the first round below.",
      addRound: "Add round",
      newRound: "Round {{n}} entry",
      centre: "To centre",
      stack: "Stack left",
      net: "Net",
      score: "Score",
      directNet: "Enter net score directly",
      byCounts: "By card counts",
      submitRound: "Save round",
      editRound: "Edit round {{n}}",
      finish: "Finish game",
      abandon: "Abandon",
      abandonConfirm: "Abandon this game? It will be soft-deleted.",
      finishConfirm: "Finish the game and freeze the final standings?",
      targetReached: "Target reached — finish the game?",
      finishNow: "Finish now",
      keepPlaying: "Keep playing",
      completedNote: "This game is finished.",
      abandonedNote: "This game was abandoned.",
      winnerIs: "🏆 {{name}} wins!",
      seat: "Seat",
      player: "Player",
    },

    history: {
      title: "History",
      subtitle: "Your games, newest first",
      empty: "No games in your history yet.",
      loadMore: "Load more",
      open: "Details",
    },

    stats: {
      title: "Your stats",
      gamesPlayed: "Games",
      wins: "Wins",
      winRate: "Win rate",
      avgScore: "Avg score",
      bestRound: "Best round",
    },

    profile: {
      title: "Profile",
      subtitle: "Your name and icon, as other players see you",
      displayName: "Display name",
      displayNameHelp: "Shown on scoreboards and in your games.",
      languageHelp: "Saved to your profile and applied on every device.",
      iconTitle: "Your icon",
      removeIcon: "Remove icon",
      tabEmoji: "Emoji",
      tabAvatars: "Avatars",
      tabPhoto: "Photo",
      choosePhoto: "Upload a photo",
      changePhoto: "Change photo",
      photoHint: "Square works best — it’s resized and cropped on your device before uploading.",
      photoError: "Couldn’t read that image. Try another file.",
      nameRequired: "Enter a display name.",
      saved: "Profile saved",
      saveError: "Couldn’t save your profile",
    },

    rules: {
      title: "How to play Ligretto",
      intro:
        "Ligretto is a fast, chaotic real-time card game. Everyone plays at the same time — there are no turns. Race to empty your Ligretto stack onto shared centre piles before anyone else.",
      sections: [
        {
          heading: "Setup",
          items: [
            "Each player takes one coloured deck of 40 cards (numbered 1–10 in four colours).",
            "Shuffle your own deck. Deal a face-up Ligretto stack of 10 cards, and a row of 3 face-up cards next to it.",
            "Hold the rest as your draw pile.",
          ],
        },
        {
          heading: "Playing (all at once)",
          items: [
            "Every card numbered 1 starts a new pile in the shared centre. Build each centre pile up in sequence (1, 2, 3 …) regardless of colour.",
            "Play cards from your three face-up row cards and from the top of your Ligretto stack.",
            "Refill your row from your draw pile to always keep three cards available (flip the draw pile three at a time).",
            "There are no turns — play as fast as you can. Speed is everything.",
          ],
        },
        {
          heading: "Ending a round",
          items: [
            "A round ends the instant one player empties their Ligretto stack and calls “Ligretto!”.",
            "Everyone stops immediately.",
          ],
        },
        {
          heading: "Scoring",
          items: [
            "Count the cards you played into the centre piles — that is your positive score.",
            "Then count the cards still left in your Ligretto stack — each one costs you 2 points.",
            "Round score = cards played to centre − 2 × cards left in your Ligretto stack.",
            "Your total is the sum of your round scores across the game.",
          ],
        },
        {
          heading: "Winning",
          items: [
            "Agree a target before you start: a number of rounds, or a points total.",
            "Rounds target: the game ends after that many rounds — highest total wins.",
            "Points target: the first player to reach the target total wins.",
            "Ties are allowed — the scoreboard highlights every leader.",
          ],
        },
      ],
      scoringExampleTitle: "Scoring example",
      scoringExample:
        "You played 23 cards to the centre and had 2 cards left in your Ligretto stack: 23 − 2 × 2 = 19 points for the round.",
    },
  },
};

export type AppResources = typeof en;
