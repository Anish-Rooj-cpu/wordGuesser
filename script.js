// REPLACE THESE WITH YOUR SUPABASE DETAILS
const SUPABASE_URL = 'https://qarkceigmiwpmborlvbe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhcmtjZWlnbWl3cG1ib3JsdmJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3MjE1MDgsImV4cCI6MjEwNTI5NzUwOH0.PmSFZmX-ANSzc-gAf844rpMg8rFH-jbaHcw9e0Y17Bo';

// Initialize Supabase Client
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const words = [
    "APPLE", "BANK", "BERLIN", "BOARD", "BOMB", "BOX", "BUG", "CAMP", "CARD", "CAT",
    "CHAIR", "CODE", "COLD", "DANCE", "DOG", "DRAGON", "EAGLE", "EYE", "FIRE", "FISH",
    "FOOT", "GAME", "GHOST", "GLASS", "GOLD", "GREEN", "HAND", "HEART", "HOLE", "HORN",
    "HORSE", "ICE", "IRON", "KEY", "KNIFE", "LEMON", "LIGHT", "LION", "MAGIC", "MAP",
    "MOON", "MOUSE", "NIGHT", "NINJA", "PAPER", "PARK", "PIE", "PILOT", "PITCH", "PLANE",
    "PLASTIC", "POISON", "QUEEN", "RING", "ROBOT", "ROCK", "ROOT", "ROSE", "SCALE", "SCREEN",
    "SHARK", "SHIP", "SHOE", "SHOP", "SNOW", "SOUND", "SPACE", "SPIDER", "SPRING", "STAR",
    "STATE", "STICK", "STOCK", "STRIKE", "SUIT", "SUN", "TABLE", "TAIL", "TEACHER", "THIEF",
    "TIME", "TOOTH", "TOWER", "TRAIN", "TREE", "TUBE", "VACUUM", "WALL", "WATCH", "WATER",
    "WAVE", "WEB", "WHIP", "WIND", "WITCH", "WORM", "YARD", "AFRICA", "ALIEN", "ALPS",
    "AMAZON", "ANGEL", "ANTARCTICA", "APPLE", "ARM", "ATLANTIS", "AUSTRALIA", "AZTEC", "BACK", "BALL",
    "BAND", "BARK", "BAT", "BATTERY", "BEACH", "BEAR", "BEAT", "BED", "BEIJING", "BELL",
    "BELT", "BILL", "BLOCK", "BONE", "BOTTLE", "BOW", "BOWL", "BRIDGE", "BRUSH", "BUCK",
    "BUTTON", "CALF", "CANADA", "CAP", "CAPITAL", "CAR", "CARROT", "CASINO", "CAST", "CAT",
    "CELL", "CENTAUR", "CENTER", "CHAIR", "CHANGE", "CHARGE", "CHECK", "CHEST", "CHICK", "CHINA"
];

let gameState = {
    game_code: '',
    turn: 'red',
    redLeft: 12,
    blueLeft: 12,
    cards: [],
    gameOver: false,
    winner: '',
    chat_log: [],
    myTeam: 'red',
    myRole: 'guesser',
    guessesRemaining: 0
};

let realtimeSubscription = null;

// DOM Elements
const lobbyScreen = document.getElementById('lobby-screen');
const gameScreen = document.getElementById('game-screen');
const boardEl = document.getElementById('board');
const redLeftEl = document.getElementById('red-left');
const blueLeftEl = document.getElementById('blue-left');
const turnIndicator = document.getElementById('turn-indicator');
const displayGameId = document.getElementById('display-game-id');
const playerInfoBadge = document.getElementById('player-info-badge');

// Lobby Elements
const createTeamSelect = document.getElementById('create-team');
const createRoleSelect = document.getElementById('create-role');
const createBtn = document.getElementById('create-btn');
const joinIdInput = document.getElementById('join-id');
const joinTeamSelect = document.getElementById('join-team');
const joinRoleSelect = document.getElementById('join-role');
const joinBtn = document.getElementById('join-btn');

// Game Elements
const endTurnBtn = document.getElementById('end-turn-btn');
const hintWordInput = document.getElementById('hint-word');
const hintNumberInput = document.getElementById('hint-number');
const submitHintBtn = document.getElementById('submit-hint');
const hintControls = document.getElementById('hint-controls');
const hintLog = document.getElementById('hint-log');
const gameOverModal = document.getElementById('game-over-modal');
const winnerText = document.getElementById('winner-text');
const newGameBtn = document.getElementById('new-game-btn'); // Return to Lobby

async function startNewGame() {
    createBtn.disabled = true;
    createBtn.textContent = 'Creating...';
    
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    gameState.myTeam = createTeamSelect.value;
    gameState.myRole = createRoleSelect.value;
    
    // Generate Cards
    let shuffledWords = [...words].sort(() => Math.random() - 0.5);
    const selectedWords = shuffledWords.slice(0, 25);
    
    let teams = [];
    for(let i=0; i<12; i++) teams.push('red');
    for(let i=0; i<12; i++) teams.push('blue');
    teams.push('black');
    teams.sort(() => Math.random() - 0.5);
    
    let generatedCards = [];
    for (let i = 0; i < 25; i++) {
        generatedCards.push({ word: selectedWords[i], team: teams[i], revealed: false });
    }
    
    const roleKey = `${gameState.myTeam}_${gameState.myRole}`;
    
    // Insert into Supabase
    const { data, error } = await db
        .from('games')
        .insert([{
            game_code: newCode,
            board_cards: generatedCards,
            turn: 'red',
            red_left: 12,
            blue_left: 12,
            chat_log: [],
            game_over: false,
            winner_message: '',
            players: { [roleKey]: true },
            guesses_remaining: 0
        }]);
        
    createBtn.disabled = false;
    createBtn.textContent = 'Generate Game';
        
    if (error) {
        alert("Error creating game: " + error.message);
        return;
    }
    
    await enterGame(newCode);
}

async function joinExistingGame() {
    let codeStr = joinIdInput.value.trim().toUpperCase();
    if (!codeStr) {
        alert("Please enter a Game Code to join.");
        return;
    }
    
    joinBtn.disabled = true;
    joinBtn.textContent = 'Joining...';
    
    gameState.myTeam = joinTeamSelect.value;
    gameState.myRole = joinRoleSelect.value;
    const roleKey = `${gameState.myTeam}_${gameState.myRole}`;
    
    const { data, error } = await db
        .from('games')
        .select('*')
        .eq('game_code', codeStr)
        .single();
        
    if (error || !data) {
        joinBtn.disabled = false;
        joinBtn.textContent = 'Join Game';
        alert("Game not found or error: " + (error ? error.message : 'Invalid code.'));
        return;
    }
    
    // Check if role is taken
    let currentPlayers = data.players || {};
    if (currentPlayers[roleKey]) {
        // If it's taken, check if they are rejoining (we'll just let them in with a warning for simplicity)
        const confirmRejoin = confirm(`The role ${gameState.myTeam.toUpperCase()} ${gameState.myRole.toUpperCase()} is already taken in this game. Are you rejoining?`);
        if (!confirmRejoin) {
            joinBtn.disabled = false;
            joinBtn.textContent = 'Join Game';
            return;
        }
    } else {
        // Claim the role
        currentPlayers[roleKey] = true;
        await db.from('games').update({ players: currentPlayers }).eq('game_code', codeStr);
    }
    
    joinBtn.disabled = false;
    joinBtn.textContent = 'Join Game';
    
    await enterGame(codeStr, data);
}

async function enterGame(codeStr, existingData = null) {
    gameState.game_code = codeStr;
    
    // UI Transitions
    lobbyScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    displayGameId.textContent = codeStr;
    playerInfoBadge.textContent = `${gameState.myTeam.toUpperCase()} ${gameState.myRole.toUpperCase()}`;
    
    // Role Enforcement
    document.body.classList.remove('spymaster');
    if (gameState.myRole === 'guesser') {
        hintControls.style.display = 'none';
    } else {
        hintControls.style.display = 'flex';
        document.body.classList.add('spymaster');
    }
    
    gameOverModal.classList.add('hidden');
    
    // Subscribe to realtime changes
    if (realtimeSubscription) {
        await db.removeChannel(realtimeSubscription);
    }
    
    realtimeSubscription = db.channel('custom-all-channel')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `game_code=eq.${codeStr}` },
        (payload) => {
            syncStateWithDB(payload.new);
        }
      )
      .subscribe();
      
    // If we joined an existing game, sync the initial state immediately
    if (existingData) {
        syncStateWithDB(existingData);
        logLocalSystemMessage(`Joined as ${gameState.myTeam.toUpperCase()} ${gameState.myRole.toUpperCase()}`);
    } else {
        // We created a new game, we need to fetch the newly created data or just rely on local state
        // Let's do a quick fetch to ensure sync
        const { data } = await db.from('games').select('*').eq('game_code', codeStr).single();
        if(data) syncStateWithDB(data);
        
        await broadcastSystemMessage(`Game created. Joined as ${gameState.myTeam.toUpperCase()} ${gameState.myRole.toUpperCase()}`);
    }
}

function syncStateWithDB(dbData) {
    gameState.cards = dbData.board_cards;
    gameState.turn = dbData.turn;
    gameState.redLeft = dbData.red_left;
    gameState.blueLeft = dbData.blue_left;
    gameState.gameOver = dbData.game_over;
    gameState.winner = dbData.winner_message;
    gameState.chat_log = dbData.chat_log || [];
    gameState.guessesRemaining = dbData.guesses_remaining || 0;
    
    renderBoard();
    updateUI();
    renderChatLog();
    
    if (gameState.gameOver && gameOverModal.classList.contains('hidden')) {
        winnerText.textContent = gameState.winner;
        winnerText.className = gameState.winner.includes('Red') ? 'red-win' : (gameState.winner.includes('Blue') ? 'blue-win' : '');
        gameOverModal.classList.remove('hidden');
        if (window.confetti) {
            confetti({
                particleCount: 150,
                spread: 80,
                origin: { y: 0.6 }
            });
        }
    }
}

async function handleCardClick(index) {
    if (gameState.gameOver) return;
    if (gameState.myRole === 'spymaster') return;
    if (gameState.myTeam !== gameState.turn) return; // not your team's turn
    if (gameState.guessesRemaining <= 0) return; // no guesses left, wait for hint
    
    const card = gameState.cards[index];
    if (card.revealed) return;
    
    // Reveal the card
    card.revealed = true;
    let nextTurn = gameState.turn;
    let newRedLeft = gameState.redLeft;
    let newBlueLeft = gameState.blueLeft;
    let newGameOver = false;
    let newWinnerMsg = '';
    let newGuessesRemaining = gameState.guessesRemaining - 1;
    let turnEnded = false;
    
    if (card.team === 'red') {
        newRedLeft--;
        // If red clicked their own card during red's turn, keep going; otherwise end turn
        if (gameState.turn !== 'red') { nextTurn = gameState.turn === 'red' ? 'blue' : 'red'; turnEnded = true; }
    } else if (card.team === 'blue') {
        newBlueLeft--;
        if (gameState.turn !== 'blue') { nextTurn = gameState.turn === 'red' ? 'blue' : 'red'; turnEnded = true; }
    } else if (card.team === 'black') {
        newGameOver = true;
        newWinnerMsg = 'Assassin revealed! ' + (gameState.turn === 'red' ? 'Blue' : 'Red') + ' Team Wins!';
        gameState.cards.forEach(c => c.revealed = true);
    }
    
    // Wrong team card → end turn immediately
    if (!newGameOver && card.team !== gameState.turn && card.team !== 'black') {
        nextTurn = gameState.turn === 'red' ? 'blue' : 'red';
        newGuessesRemaining = 0;
        turnEnded = true;
    }
    
    // Out of guesses → end turn
    if (!newGameOver && !turnEnded && newGuessesRemaining <= 0) {
        nextTurn = gameState.turn === 'red' ? 'blue' : 'red';
        newGuessesRemaining = 0;
    }
    
    // Check win conditions
    if (newRedLeft === 0) {
        newGameOver = true;
        newWinnerMsg = '🎉 RED TEAM WINS! 🎉';
        gameState.cards.forEach(c => c.revealed = true);
    } else if (newBlueLeft === 0) {
        newGameOver = true;
        newWinnerMsg = '🎉 BLUE TEAM WINS! 🎉';
        gameState.cards.forEach(c => c.revealed = true);
    }
    
    // Update local state and UI immediately (optimistic)
    gameState.turn = nextTurn;
    gameState.redLeft = newRedLeft;
    gameState.blueLeft = newBlueLeft;
    gameState.gameOver = newGameOver;
    gameState.winner = newWinnerMsg;
    gameState.guessesRemaining = newGuessesRemaining;
    renderBoard();
    updateUI();
    
    if (newGameOver && gameOverModal.classList.contains('hidden')) {
        winnerText.textContent = newWinnerMsg;
        winnerText.className = newWinnerMsg.includes('RED') ? 'red-win' : (newWinnerMsg.includes('BLUE') ? 'blue-win' : '');
        gameOverModal.classList.remove('hidden');
        if (window.confetti) {
            confetti({
                particleCount: 150,
                spread: 80,
                origin: { y: 0.6 }
            });
        }
    }
    
    // Push to Supabase
    await db.from('games').update({
        board_cards: gameState.cards,
        turn: nextTurn,
        red_left: newRedLeft,
        blue_left: newBlueLeft,
        game_over: newGameOver,
        winner_message: newWinnerMsg,
        guesses_remaining: newGuessesRemaining
    }).eq('game_code', gameState.game_code);
}

function renderBoard() {
    boardEl.innerHTML = '';
    gameState.cards.forEach((card, index) => {
        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        cardEl.textContent = card.word;
        
        if (card.revealed) {
            cardEl.classList.add('revealed');
            cardEl.classList.add(card.team);
        } else {
            cardEl.classList.add(card.team); // Used by spymaster view CSS
        }
        
        cardEl.addEventListener('click', () => handleCardClick(index));
        boardEl.appendChild(cardEl);
    });
}

async function endTurn() {
    if (gameState.gameOver) return;
    const nextTurn = gameState.turn === 'red' ? 'blue' : 'red';
    
    let updatedLog = [...gameState.chat_log];
    updatedLog.push({ type: 'system', text: `${nextTurn.toUpperCase()} team's turn` });
    
    await db.from('games').update({
        turn: nextTurn,
        chat_log: updatedLog,
        guesses_remaining: 0
    }).eq('game_code', gameState.game_code);
}

function updateUI() {
    redLeftEl.textContent = gameState.redLeft;
    blueLeftEl.textContent = gameState.blueLeft;
    
    const guessText = gameState.guessesRemaining > 0 ? ` (${gameState.guessesRemaining} left)` : '';
    
    if (gameState.turn === 'red') {
        turnIndicator.textContent = "Red's Turn" + guessText;
        turnIndicator.className = 'turn-pill';
    } else {
        turnIndicator.textContent = "Blue's Turn" + guessText;
        turnIndicator.className = 'turn-pill blue';
    }
}

async function broadcastSystemMessage(msg) {
    let updatedLog = [...gameState.chat_log];
    updatedLog.push({ type: 'system', text: msg });
    
    await db.from('games').update({
        chat_log: updatedLog
    }).eq('game_code', gameState.game_code);
}

function logLocalSystemMessage(msg) {
    // Only local, doesn't get saved to DB (useful for "You joined" messages)
    const el = document.createElement('div');
    el.className = 'hint-msg system';
    el.textContent = msg;
    hintLog.appendChild(el);
    hintLog.scrollTop = hintLog.scrollHeight;
}

function renderChatLog() {
    hintLog.innerHTML = '';
    gameState.chat_log.forEach(msg => {
        const el = document.createElement('div');
        if (msg.type === 'system') {
            el.className = 'hint-msg system';
            el.textContent = msg.text;
        } else {
            el.className = `hint-msg ${msg.team}`;
            el.innerHTML = `<strong>${msg.team.toUpperCase()} Spymaster:</strong> ${msg.text}`;
        }
        hintLog.appendChild(el);
    });
    hintLog.scrollTop = hintLog.scrollHeight;
}

async function submitHint() {
    if (gameState.gameOver) return;
    
    // Only the spymaster whose team's turn it is can send hints
    if (gameState.myTeam !== gameState.turn) {
        alert("It's not your team's turn!");
        return;
    }
    
    const word = hintWordInput.value.trim();
    const number = parseInt(hintNumberInput.value.trim(), 10);
    
    if (!word || isNaN(number) || number < 0) return;
    
    // Hint cannot exactly match any unrevealed word on the board
    const hintUpper = word.toUpperCase();
    const boardWords = gameState.cards.filter(c => !c.revealed).map(c => c.word.toUpperCase());
    
    if (boardWords.includes(hintUpper)) {
        alert("Your hint cannot be a word that is currently on the board!");
        return;
    }
    
    const hintString = `${hintUpper} - ${number}`;
    
    let updatedLog = [...gameState.chat_log];
    updatedLog.push({ type: 'hint', team: gameState.myTeam, text: hintString });
    
    // In Codenames, guessers get N + 1 guesses to allow catching up on missed words
    const allowedGuesses = number + 1;
    
    await db.from('games').update({
        chat_log: updatedLog,
        guesses_remaining: allowedGuesses
    }).eq('game_code', gameState.game_code);
    
    hintWordInput.value = '';
    hintNumberInput.value = '';
}

// Event Listeners
createBtn.addEventListener('click', startNewGame);
joinBtn.addEventListener('click', joinExistingGame);
endTurnBtn.addEventListener('click', endTurn);

submitHintBtn.addEventListener('click', submitHint);
hintWordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') submitHint();
});
hintNumberInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') submitHint();
});

newGameBtn.addEventListener('click', async () => {
    if (realtimeSubscription) {
        await db.removeChannel(realtimeSubscription);
        realtimeSubscription = null;
    }
    gameScreen.classList.add('hidden');
    lobbyScreen.classList.remove('hidden');
    gameOverModal.classList.add('hidden');
});

// Rules Modal Logic
const rulesModal = document.getElementById('rules-modal');
const rulesBtnLobby = document.getElementById('rules-btn-lobby');
const rulesBtnGame = document.getElementById('rules-btn-game');
const closeRulesBtn = document.getElementById('close-rules-btn');

rulesBtnLobby.addEventListener('click', () => rulesModal.classList.remove('hidden'));
rulesBtnGame.addEventListener('click', () => rulesModal.classList.remove('hidden'));
closeRulesBtn.addEventListener('click', () => rulesModal.classList.add('hidden'));
