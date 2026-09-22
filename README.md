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

### 1. Supabase Setup & Connecting a Database

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste the contents of [`sql/schema.sql`](sql/schema.sql) and run it.

The script creates the `games` table, enables row-level security, adds the table to the Realtime publication, and defines all server-side RPC functions (`reveal_card`, `reveal_cards_batch`, `give_hint`, `end_turn`, `timeout_turn`, `send_chat`, `restart_game`, `start_timer`).

The anon key in `script.js` is public by design and safe to commit because row-level security is enabled and every state mutation goes through server-side Postgres functions.

### 2. Disconnecting or Switching Database Services

The frontend connects directly to Supabase via `@supabase/supabase-js` using the constants at the top of [`script.js`](script.js#L1-L6).

#### Step 1: Disconnecting the Current Database
To disconnect from the current database (`qarkceigmiwpmborlvbe.supabase.co`):
1. Open [`script.js`](script.js).
2. At lines 2–3, replace the existing credentials with empty strings or your new configuration:
   ```javascript
   // REPLACE THESE WITH YOUR SUPABASE DETAILS
   const SUPABASE_URL = '';
   const SUPABASE_ANON_KEY = '';
   ```
3. When disconnected, the client will display a graceful connection retry / offline banner in the UI without crashing.

---

#### Step 2: Connecting to a New Supabase Project (Step-by-Step)
1. **Create Project**: Go to [supabase.com](https://supabase.com) and create a new project.
2. **Execute Schema**:
   - Navigate to the **SQL Editor** tab in your Supabase dashboard.
   - Click **New query**, paste the entire contents of [`sql/schema.sql`](sql/schema.sql), and click **Run**.
   - Verify that the `games` table is created and all RPC functions (`reveal_card`, `start_timer`, etc.) are compiled.
3. **Verify Realtime Replication**:
   - Under **Database → Publications**, ensure `games` is included in the `supabase_realtime` publication (this is configured automatically by `schema.sql`).
4. **Copy API Keys**:
   - Go to **Project Settings → API**.
   - Copy the **Project URL** (e.g. `https://xyzcompany.supabase.co`).
   - Copy the **`anon` `public` key**.
5. **Update Client Config**:
   - Open [`script.js`](script.js) and paste your credentials:
     ```javascript
     const SUPABASE_URL = 'https://YOUR_NEW_PROJECT.supabase.co';
     const SUPABASE_ANON_KEY = 'YOUR_NEW_ANON_KEY';
     ```
6. **Deploy or Run**: Commit your changes or run locally with `python -m http.server 8000`.

---

#### Step 3: Migrating to Alternative Backend Services
If you prefer not to use Supabase, this application can be adapted to any backend meeting three fundamental architectural requirements:

| Backend Requirement | How Supabase Handles It | Migration Strategy for Other Platforms |
| :--- | :--- | :--- |
| **1. Realtime Pub/Sub** | `supabase_realtime` postgres changes channel | Push game state updates to all players in a room whenever the board or chat updates. |
| **2. Live Presence** | `channel.track()` and presence state | Track connected players per room, display the active roster, and coordinate Spymaster assignments. |
| **3. Server-Enforced Rules** | Postgres stored functions (`rpc`) | Atomic state validation (turns, valid hints, card reveals, assassin elimination, win conditions). |

##### Alternative Service Options:
- **Firebase (Firestore + Realtime Database / Cloud Functions)**:
  - Replace `@supabase/supabase-js` with the Firebase SDK in `index.html`.
  - Store room documents in **Firestore** and listen with `onSnapshot()`.
  - Port Postgres functions in `sql/schema.sql` to **Firebase Cloud Functions** (HTTP callables or Firestore transactions) to preserve server-side validation.
  - Use **Firebase Realtime Database Presence** (`.info/connected`) for the player roster.
- **PocketBase (Go / SQLite)**:
  - Create a `games` collection with real-time subscriptions (`pb.collection('games').subscribe(...)`).
  - Implement custom PocketBase Go/JS route hooks to validate game actions (`reveal_card`, `start_timer`, etc.) before persisting.
- **Self-Hosted PostgreSQL / Neon**:
  - Run [`sql/schema.sql`](sql/schema.sql) on any standard PostgreSQL instance.
  - Expose PostgREST and the open-source Supabase Realtime Server, or front it with a lightweight WebSocket gateway.
- **Custom Node.js / Bun WebSocket Server (Socket.io / ws)**:
  - Maintain room state in-memory or in Redis.
  - Replace `db.rpc(...)` calls in `script.js` with `socket.emit(...)`.
  - Handle player join/leave and roster events directly over WebSockets.

---

### 3. Turn Timer & Host Controls
- In timed games (configured during room creation), the room creator (host) has a **▶ Start Timer** button.
- Guests see **⏳ Waiting for host to start**.
- Once the host starts the timer, a synchronized turn clock runs for all clients in the room.
- If the server has an older schema without the `start_timer` RPC, the client automatically falls back to an in-band system chat broadcast (`Timer started!`), ensuring host and guests stay completely in sync.
- Chat messages and card reveals within the current turn do not reset the timer or its elapsed duration.

### 4. Run locally

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

### 5. Deploy to GitHub Pages

Repository **Settings → Pages**, branch `main`, folder `/ (root)`. The game is static, so nothing else is needed.

### 6. Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FThe-AlphaWolf%2FCodeNames)

1. Click the button above or go to [vercel.com/new](https://vercel.com/new).
2. Import `The-AlphaWolf/CodeNames`.
3. Keep default settings (Framework: Other, Root: `./`).
4. Click **Deploy**.


## ⚠️ Limitations

- **Identity is honor-system.** The browser tells the server which team and role it is. The server enforces the rules of the game (whose turn, how many guesses, valid hints), not who you are. A guesser who opens the developer tools can read the card colours. That is fine for a game among friends, not for a tournament.

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
