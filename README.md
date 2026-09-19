# Word Guesser (Codenames-style) 🕵️🎯

A real-time multiplayer word-guessing game in the spirit of **Codenames**, for 2, 3 or 4 teams. Vanilla HTML/CSS/JS on the frontend, [Supabase](https://supabase.com/) for the database, realtime sync and presence. No build step, no framework.

## ✨ Features

- **2, 3 or 4 teams** (red, blue, green, cyan) on 5×5, 6×6 or 7×7 boards, with a random starting team.
- **Elimination:** revealing an assassin knocks your team out; the others play on until one team is left.
- **Neutral (yellow) cards** that end your turn without a penalty, and **multiple assassins** (teams − 1).
- **Chat and hints:** one shared chat for guessers; spymasters can only send hints.
- **Live presence:** see who is in the room, with name, team and role.
- **Server-side rules:** every move goes through Postgres functions that enforce turn order, guess counts, hint validity and winning.
- **Reconnect handling:** automatic retry with backoff, and a refresh puts you back in your room.
- **Play again** with one click, no new room code.
- **Accessible:** keyboard-playable board, dialog focus handling, screen-reader announcements.

## 🎮 How to Play

1. One player creates a room (choosing 2, 3 or 4 teams) and shares the 6-character code. Everyone else joins with it, or opens the link with `?code=XXXXXX`.
2. Pick a team and a role. Roles are not reserved: anyone can pick any team and role.
3. Board sizes:
   - **2 teams:** 5×5, 8 words per team, 8 yellow neutrals, 1 assassin.
   - **3 teams:** 6×6, 8 per team, 10 neutrals, 2 assassins.
   - **4 teams:** 7×7, 9 per team, 10 neutrals, 3 assassins.
4. The **spymaster** sees every colour and gives **one word** (letters, apostrophe or hyphen, max 20 characters) plus a **number**, only when their team has no guesses left. The word cannot be a word on the board.
5. The **guessers** get exactly that many guesses. Your own team's card: keep going. Another team's card or a yellow neutral: your turn ends (a neutral gives no penalty and no point).
6. **Assassin:** your team is eliminated; the other teams keep playing.
7. A team **wins** by revealing all its words (whoever revealed the last one) or by being the last team not eliminated.
8. Guessers of all teams can chat; spymasters can only send hints.

## 🛠️ Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste the contents of [`sql/schema.sql`](sql/schema.sql) and run it.

That's all. The script **drops and recreates the `games` table**, so run it on a fresh project (or one where you don't need old games). It also enables row-level security, adds the table to the Realtime publication and creates the rule-enforcing functions (`reveal_card`, `give_hint`, `end_turn`, `send_chat`, `restart_game`).

The anon key in `script.js` is public by design. It is safe only because row-level security is on and every change to a game goes through those functions: the browser can create and read games but cannot `UPDATE` them directly.

### 2. Frontend configuration

Open `script.js` and replace the two values at the top with your project's URL and anon key:

```javascript
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
```

### 3. Run locally

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

### 4. Deploy to GitHub Pages

Repository **Settings → Pages**, branch `main`, folder `/ (root)`. The game is static, so nothing else is needed.

## ⚠️ Limitations

- **Identity is honor-system.** The browser tells the server which team and role it is. The server enforces the rules of the game (whose turn, how many guesses, valid hints), not who you are. A guesser who opens the developer tools can read the card colours. That is fine for a game among friends, not for a tournament.
- There is no turn timer.

## 🧪 Tests

- **`test.html`**: pure-logic checks (board composition for 2, 3 and 4 teams, hint validation, word list). Serve the folder and open `/test.html`; it should end with `ALL PASSED`.
- **`tests/`**: dev-only tooling, not part of the game. It runs the real `schema.sql` in an in-memory Postgres and drives the real page in simulated browsers (full games, elimination, races, reconnect, accessibility):

  ```bash
  cd tests
  npm install
  npm test        # integration suite
  npm run dev     # local app + fake Supabase on http://127.0.0.1:8766
  ```

## 🧹 Cleaning up old games

Games are never deleted automatically. Run this in the SQL Editor now and then:

```sql
delete from games where updated_at < now() - interval '1 day';
```

## 📄 License

[MIT](LICENSE)
