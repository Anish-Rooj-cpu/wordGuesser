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

// Seeded PRNG (Mulberry32)
function mulberry32(a) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

// Generate a seed from string
function xmur3(str) {
    for(var i = 0, h = 1779033703 ^ str.length; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = h << 13 | h >>> 19;
    } return function() {
        h = Math.imul(h ^ h >>> 16, 2246822507);
        h = Math.imul(h ^ h >>> 13, 3266489909);
        return (h ^= h >>> 16) >>> 0;
    }
}

let random; // Function to get random number
let gameState = {
    turn: 'red', // 'red' or 'blue'
    redLeft: 12,
    blueLeft: 12,
    cards: [],
    gameOver: false,
    seed: '',
    myTeam: 'red',
    myRole: 'guesser'
};

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
const spymasterToggleBtn = document.getElementById('spymaster-toggle');
const endTurnBtn = document.getElementById('end-turn-btn');
const hintWordInput = document.getElementById('hint-word');
const hintNumberInput = document.getElementById('hint-number');
const submitHintBtn = document.getElementById('submit-hint');
const hintControls = document.getElementById('hint-controls');
const hintLog = document.getElementById('hint-log');
const gameOverModal = document.getElementById('game-over-modal');
const winnerText = document.getElementById('winner-text');
const newGameBtn = document.getElementById('new-game-btn'); // Return to Lobby

function startNewGame() {
    const newSeed = Math.random().toString(36).substring(2, 8).toUpperCase();
    gameState.myTeam = createTeamSelect.value;
    gameState.myRole = createRoleSelect.value;
    initGame(newSeed);
}

function joinExistingGame() {
    let seedStr = joinIdInput.value.trim().toUpperCase();
    if (!seedStr) {
        alert("Please enter a Game Code to join.");
        return;
    }
    gameState.myTeam = joinTeamSelect.value;
    gameState.myRole = joinRoleSelect.value;
    initGame(seedStr);
}

function initGame(seedStr) {
    gameState.seed = seedStr;
    const seedGen = xmur3(seedStr);
    random = mulberry32(seedGen());

    gameState.turn = 'red';
    gameState.redLeft = 12;
    gameState.blueLeft = 12;
    gameState.gameOver = false;
    gameState.cards = [];
    
    // UI Transitions
    lobbyScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    displayGameId.textContent = seedStr;
    playerInfoBadge.textContent = `${gameState.myTeam.toUpperCase()} ${gameState.myRole.toUpperCase()}`;
    
    // Role Enforcement
    document.body.classList.remove('spymaster');
    if (gameState.myRole === 'guesser') {
        spymasterToggleBtn.style.display = 'none';
        hintControls.style.display = 'none';
    } else {
        spymasterToggleBtn.style.display = 'inline-block';
        hintControls.style.display = 'flex';
        // Auto-enable spymaster view for spymasters
        document.body.classList.add('spymaster');
    }
    
    hintLog.innerHTML = '';
    gameOverModal.classList.add('hidden');
    
    generateCards();
    renderBoard();
    updateUI();
    
    addSystemLog(`Joined as ${gameState.myTeam.toUpperCase()} ${gameState.myRole.toUpperCase()}`);
}

function generateCards() {
    // Shuffle words
    let shuffledWords = [...words];
    for (let i = shuffledWords.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [shuffledWords[i], shuffledWords[j]] = [shuffledWords[j], shuffledWords[i]];
    }
    
    const selectedWords = shuffledWords.slice(0, 25);
    
    // Assign teams: 12 Red, 12 Blue, 1 Black
    let teams = [];
    for(let i=0; i<12; i++) teams.push('red');
    for(let i=0; i<12; i++) teams.push('blue');
    teams.push('black');
    
    // Shuffle teams
    for (let i = teams.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [teams[i], teams[j]] = [teams[j], teams[i]];
    }
    
    for (let i = 0; i < 25; i++) {
        gameState.cards.push({
            word: selectedWords[i],
            team: teams[i],
            revealed: false
        });
    }
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

function handleCardClick(index) {
    if (gameState.gameOver) return;
    const card = gameState.cards[index];
    if (card.revealed) return;
    
    card.revealed = true;
    
    if (card.team === 'red') {
        gameState.redLeft--;
        if (gameState.turn !== 'red') endTurn();
    } else if (card.team === 'blue') {
        gameState.blueLeft--;
        if (gameState.turn !== 'blue') endTurn();
    } else if (card.team === 'black') {
        // Assassin clicked
        endGame(gameState.turn === 'red' ? 'blue' : 'red', 'Assassin revealed!');
        renderBoard();
        return;
    }
    
    renderBoard();
    updateUI();
    
    if (gameState.redLeft === 0) {
        endGame('red', 'Red Team Wins!');
    } else if (gameState.blueLeft === 0) {
        endGame('blue', 'Blue Team Wins!');
    }
}

function endTurn() {
    gameState.turn = gameState.turn === 'red' ? 'blue' : 'red';
    addSystemLog(`${gameState.turn.toUpperCase()} team's turn`);
    updateUI();
}

function updateUI() {
    redLeftEl.textContent = gameState.redLeft;
    blueLeftEl.textContent = gameState.blueLeft;
    
    if (gameState.turn === 'red') {
        turnIndicator.textContent = "Red's Turn";
        turnIndicator.className = 'turn-indicator';
    } else {
        turnIndicator.textContent = "Blue's Turn";
        turnIndicator.className = 'turn-indicator blue';
    }
}

function endGame(winner, message) {
    gameState.gameOver = true;
    winnerText.textContent = message;
    winnerText.className = winner === 'red' ? 'red-win' : 'blue-win';
    
    // Reveal all cards
    gameState.cards.forEach(card => card.revealed = true);
    renderBoard();
    
    setTimeout(() => {
        gameOverModal.classList.remove('hidden');
    }, 500);
}

function addSystemLog(msg) {
    const el = document.createElement('div');
    el.className = 'hint-msg system';
    el.textContent = msg;
    hintLog.appendChild(el);
    hintLog.scrollTop = hintLog.scrollHeight;
}

function submitHint() {
    if (gameState.gameOver) return;
    
    const word = hintWordInput.value.trim();
    const number = hintNumberInput.value.trim();
    
    if (!word || !number) return;
    
    const el = document.createElement('div');
    el.className = `hint-msg ${gameState.turn}`;
    el.innerHTML = `<strong>${gameState.turn.toUpperCase()} Spymaster:</strong> ${word.toUpperCase()} - ${number}`;
    
    hintLog.appendChild(el);
    hintLog.scrollTop = hintLog.scrollHeight;
    
    hintWordInput.value = '';
    hintNumberInput.value = '';
}

// Event Listeners
createBtn.addEventListener('click', startNewGame);
joinBtn.addEventListener('click', joinExistingGame);
endTurnBtn.addEventListener('click', endTurn);
spymasterToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('spymaster');
});

submitHintBtn.addEventListener('click', submitHint);
hintWordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') submitHint();
});
hintNumberInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') submitHint();
});

newGameBtn.addEventListener('click', () => {
    gameScreen.classList.add('hidden');
    lobbyScreen.classList.remove('hidden');
    gameOverModal.classList.add('hidden');
});
