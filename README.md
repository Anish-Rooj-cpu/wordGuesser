# Word Guesser (Codenames Clone) 🕵️🎯

A full-stack, real-time multiplayer implementation of the classic board game **Codenames**. Built completely with vanilla HTML/CSS/JS on the frontend and powered by **Supabase** for real-time state synchronization and presence.

## ✨ Features

- **Real-Time Multiplayer:** Instant board updates and chat synchronization across all connected clients using Supabase Realtime channels.
- **Active Player Roster:** See who is currently in your game lobby with live presence tracking (shows names, teams, and roles).
- **Massive Word Dictionary:** Over 1,200 unique English nouns and objects ensures thousands of games without ever repeating the exact same board.
- **Strict Rule Enforcement:** 
  - Guessers are limited to exactly `N` guesses (where `N` is the hint number provided by the Spymaster).
  - Spymasters are blocked from submitting hints that exactly match any unrevealed words on the board.
  - Spymasters can only communicate when it is their team's turn.
- **Play Again:** A seamless 1-click game restart that generates a fresh board and immediately syncs it to everyone in the room without requiring a new room code.
- **Premium UI/UX:** A sleek dark theme, responsive grid layout for mobile and desktop, animated confetti for winners, and custom badges.

## 🎮 How to Play

1. **Create or Join a Room:** One player creates a room and shares the generated 6-character Game Code. The other players join using that code.
2. **Choose Roles:** Players join a team (Red or Blue) and pick a role (Spymaster or Guesser).
3. **The Spymaster's Job:** Spymasters can see the true colors of all 25 cards on the board. They must give a 1-word hint and a number (e.g., "Ocean - 2") to guide their Guessers to their team's cards.
4. **The Guesser's Job:** Guessers see only the words. Based on the hint, they select cards they believe belong to their team.
5. **Winning:** The first team to reveal all of their cards wins. Be careful—if a Guesser selects the black Assassin card, their team instantly loses!

## 🛠️ Tech Stack

- **Frontend:** Pure HTML5, CSS3 (Custom Variables, Flexbox, Grid), and Vanilla JavaScript (ES6+).
- **Backend / Database:** [Supabase](https://supabase.com/) (PostgreSQL).
- **Realtime:** Supabase JS Client (Realtime Postgres Changes & Presence API).
- **Deployment:** GitHub Pages (Frontend) & Supabase (Backend).

## 🚀 Setup & Installation

If you'd like to fork this project and run your own instance, follow these steps:

### 1. Supabase Setup
Create a new project on [Supabase](https://supabase.com). Go to the **SQL Editor** and run the following migration to create the `games` table:

```sql
CREATE TABLE games (
    game_code TEXT PRIMARY KEY,
    board_cards JSONB NOT NULL,
    turn TEXT NOT NULL,
    red_left INT8 NOT NULL,
    blue_left INT8 NOT NULL,
    chat_log JSONB DEFAULT '[]'::jsonb,
    game_over BOOLEAN DEFAULT false,
    winner_message TEXT DEFAULT '',
    players JSONB DEFAULT '{}'::jsonb,
    guesses_remaining INT8 DEFAULT 0
);
```

Then, go to **Database → Replication** and enable replication for the `games` table so the client can receive real-time updates.

### 2. Frontend Configuration
Clone the repository and open `script.js`. Replace the credentials at the very top of the file with your own Supabase project URL and anon key:

```javascript
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
```

### 3. Run Locally
Because this is a static frontend, you don't need a build step or node modules! Simply open `index.html` in your browser, or serve the directory using a simple local server:

```bash
# Python 3
python -m http.server 8000
```
Then visit `http://localhost:8000` in your browser.

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page.
