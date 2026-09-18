// REPLACE THESE WITH YOUR SUPABASE DETAILS
const SUPABASE_URL = 'https://qarkceigmiwpmborlvbe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhcmtjZWlnbWl3cG1ib3JsdmJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3MjE1MDgsImV4cCI6MjEwNTI5NzUwOH0.PmSFZmX-ANSzc-gAf844rpMg8rFH-jbaHcw9e0Y17Bo';

// Initialize Supabase Client
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const words = ["PEOPLE", "HISTORY", "WORLD", "FAMILY", "HEALTH", "SYSTEM", "COMPUTER", "MEAT", "YEAR", "THANKS", "MUSIC", "PERSON", "READING", "METHOD", "DATA", "FOOD", "THEORY", "BIRD", "PROBLEM", "SOFTWARE", "CONTROL", "KNOWLEDGE", "POWER", "ABILITY", "ECONOMICS", "LOVE", "INTERNET", "SCIENCE", "LIBRARY", "NATURE", "FACT", "PRODUCT", "IDEA", "AREA", "SOCIETY", "ACTIVITY", "STORY", "INDUSTRY", "MEDIA", "THING", "OVEN", "COMMUNITY", "SAFETY", "QUALITY", "LANGUAGE", "PLAYER", "VARIETY", "VIDEO", "WEEK", "SECURITY", "COUNTRY", "EXAM", "MOVIE", "EQUIPMENT", "PHYSICS", "ANALYSIS", "POLICY", "SERIES", "THOUGHT", "BASIS", "BOYFRIEND", "DIRECTION", "STRATEGY", "ARMY", "CAMERA", "FREEDOM", "PAPER", "CHILD", "INSTANCE", "MONTH", "TRUTH", "MARKETING", "WRITING", "ARTICLE", "GOAL", "NEWS", "AUDIENCE", "FISHING", "GROWTH", "INCOME", "MARRIAGE", "USER", "FAILURE", "MEANING", "MEDICINE", "TEACHER", "NIGHT", "CHEMISTRY", "DISEASE", "DISK", "ENERGY", "NATION", "ROAD", "ROLE", "SOUP", "LOCATION", "SUCCESS", "ADDITION", "APARTMENT", "EDUCATION", "MATH", "MOMENT", "PAINTING", "POLITICS", "ATTENTION", "DECISION", "EVENT", "PROPERTY", "SHOPPING", "STUDENT", "WOOD", "OFFICE", "PRESIDENT", "UNIT", "CATEGORY", "CIGARETTE", "CONTEXT", "DRIVER", "FLIGHT", "LENGTH", "MAGAZINE", "NEWSPAPER", "TEACHING", "CELL", "DEALER", "FINDING", "LAKE", "MEMBER", "MESSAGE", "PHONE", "SCENE", "CONCEPT", "CUSTOMER", "DEATH", "HOUSING", "INFLATION", "INSURANCE", "MOOD", "WOMAN", "ADVICE", "BLOOD", "EFFORT", "OPINION", "PAYMENT", "REALITY", "SITUATION", "SKILL", "STATEMENT", "WEALTH", "CITY", "COUNTY", "DEPTH", "ESTATE", "HEART", "PHOTO", "RECIPE", "STUDIO", "TOPIC", "PASSION", "RESOURCE", "SETTING", "AGENCY", "COLLEGE", "CRITICISM", "DEBT", "MEMORY", "PATIENCE", "SECRETARY", "SOLUTION", "ASPECT", "ATTITUDE", "DIRECTOR", "RESPONSE", "SELECTION", "STORAGE", "VERSION", "ALCOHOL", "ARGUMENT", "COMPLAINT", "CONTRACT", "EMPHASIS", "HIGHWAY", "LOSS", "STEAK", "UNION", "AGREEMENT", "CANCER", "CURRENCY", "ENTRY", "MIXTURE", "REGION", "REPUBLIC", "TRADITION", "VIRUS", "ACTOR", "CLASSROOM", "DELIVERY", "DEVICE", "DRAMA", "ELECTION", "ENGINE", "FOOTBALL", "GUIDANCE", "HOTEL", "OWNER", "PRIORITY", "TENSION", "VARIATION", "ANXIETY", "AWARENESS", "BATH", "BREAD", "CANDIDATE", "CLIMATE", "CONFUSION", "ELEVATOR", "EMOTION", "EMPLOYEE", "EMPLOYER", "GUEST", "HEIGHT", "MALL", "MANAGER", "OPERATION", "RECORDING", "SAMPLE", "CHARITY", "COUSIN", "DISASTER", "EDITOR", "EXTENT", "FEEDBACK", "GUITAR", "HOMEWORK", "LEADER", "OUTCOME", "PROMOTION", "REVENUE", "SESSION", "SINGER", "TENNIS", "BASKET", "BONUS", "CABINET", "CHILDHOOD", "CHURCH", "CLOTHES", "COFFEE", "DINNER", "DRAWING", "HAIR", "HEARING", "JUDGMENT", "MODE", "ORANGE", "POETRY", "POLICE", "PROCEDURE", "QUEEN", "RATIO", "RELATION", "SECTOR", "SIGNATURE", "SONG", "TOOTH", "TOWN", "VEHICLE", "VOLUME", "WIFE", "ACCIDENT", "AIRPORT", "ARRIVAL", "BASEBALL", "CHAPTER", "COMMITTEE", "DATABASE", "ERROR", "FARMER", "GATE", "GIRL", "HALL", "HISTORIAN", "HOSPITAL", "INJURY", "MEAL", "POEM", "PRESENCE", "PROPOSAL", "RECEPTION", "RIVER", "SPEECH", "VILLAGE", "WARNING", "WINNER", "WORKER", "WRITER", "BREATH", "BUYER", "CHEST", "CHOCOLATE", "COOKIE", "COURAGE", "DESK", "DRAWER", "GARBAGE", "GROCERY", "HONEY", "INSECT", "INSPECTOR", "KING", "LADDER", "MENU", "PENALTY", "PIANO", "POTATO", "PROFESSOR", "QUANTITY", "REACTION", "SALAD", "SISTER", "TONGUE", "WEAKNESS", "WEDDING", "AFFAIR", "AMBITION", "ANALYST", "APPLE", "ASSISTANT", "BATHROOM", "BEDROOM", "BEER", "BIRTHDAY", "CHEEK", "CLIENT", "DEPARTURE", "DIAMOND", "DIRT", "FORTUNE", "FUNERAL", "GENE", "INTENTION", "LADY", "MIDNIGHT", "PASSENGER", "PIZZA", "PLATFORM", "POET", "POLLUTION", "SHIRT", "SPEAKER", "STRANGER", "SURGERY", "SYMPATHY", "TALE", "THROAT", "TRAINER", "UNCLE", "YOUTH", "TIME", "WORK", "FILM", "WATER", "MONEY", "EXAMPLE", "WHILE", "BUSINESS", "STUDY", "GAME", "LIFE", "FORM", "PLACE", "NUMBER", "PART", "FIELD", "FISH", "BACK", "PROCESS", "HEAT", "HAND", "BOOK", "POINT", "TYPE", "HOME", "ECONOMY", "VALUE", "BODY", "MARKET", "GUIDE", "INTEREST", "STATE", "RADIO", "COURSE", "COMPANY", "PRICE", "SIZE", "CARD", "LIST", "MIND", "TRADE", "LINE", "CARE", "GROUP", "RISK", "WORD", "FORCE", "LIGHT", "TRAINING", "NAME", "SCHOOL", "AMOUNT", "LEVEL", "ORDER", "PRACTICE", "RESEARCH", "SENSE", "SERVICE", "PIECE", "BOSS", "SPORT", "HOUSE", "PAGE", "TERM", "TEST", "ANSWER", "SOUND", "FOCUS", "MATTER", "KIND", "SOIL", "BOARD", "PICTURE", "ACCESS", "GARDEN", "RANGE", "RATE", "REASON", "FUTURE", "SITE", "DEMAND", "EXERCISE", "IMAGE", "CASE", "CAUSE", "COAST", "ACTION", "BOAT", "RECORD", "RESULT", "SECTION", "BUILDING", "MOUSE", "CASH", "CLASS", "NOTHING", "PERIOD", "PLAN", "STORE", "SIDE", "SUBJECT", "SPACE", "RULE", "STOCK", "WEATHER", "CHANCE", "FIGURE", "MODEL", "SOURCE", "BEGINNING", "EARTH", "PROGRAM", "CHICKEN", "DESIGN", "FEATURE", "HEAD", "MATERIAL", "PURPOSE", "QUESTION", "ROCK", "SALT", "BIRTH", "OBJECT", "SCALE", "NOTE", "PROFIT", "RENT", "SPEED", "STYLE", "BANK", "CRAFT", "HALF", "INSIDE", "OUTSIDE", "STANDARD", "EXCHANGE", "FIRE", "POSITION", "PRESSURE", "STRESS", "ADVANTAGE", "BENEFIT", "FRAME", "ISSUE", "STEP", "CYCLE", "FACE", "ITEM", "METAL", "PAINT", "REVIEW", "ROOM", "SCREEN", "STRUCTURE", "VIEW", "ACCOUNT", "BALL", "MEDIUM", "SHARE", "BALANCE", "BLACK", "BOTTOM", "CHOICE", "GIFT", "IMPACT", "MACHINE", "SHAPE", "TOOL", "WIND", "ADDRESS", "AVERAGE", "CAREER", "CULTURE", "MORNING", "SIGN", "TABLE", "TASK", "CONDITION", "CONTACT", "CREDIT", "HOPE", "NETWORK", "NORTH", "SQUARE", "ATTEMPT", "DATE", "EFFECT", "LINK", "POST", "STAR", "VOICE", "CAPITAL", "CHALLENGE", "FRIEND", "SELF", "SHOT", "BRUSH", "COUPLE", "DEBATE", "EXIT", "FRONT", "FUNCTION", "LACK", "LIVING", "PLANT", "PLASTIC", "SPOT", "SUMMER", "TASTE", "THEME", "TRACK", "WING", "BRAIN", "BUTTON", "CLICK", "DESIRE", "FOOT", "INFLUENCE", "NOTICE", "RAIN", "WALL", "BASE", "DAMAGE", "DISTANCE", "FEELING", "PAIR", "SAVINGS", "STAFF", "SUGAR", "TARGET", "TEXT", "ANIMAL", "AUTHOR", "BUDGET", "DISCOUNT", "FILE", "GROUND", "LESSON", "MINUTE", "OFFICER", "PHASE", "REFERENCE", "REGISTER", "STAGE", "STICK", "TITLE", "TROUBLE", "BOWL", "BRIDGE", "CAMPAIGN", "CHARACTER", "CLUB", "EDGE", "EVIDENCE", "LETTER", "LOCK", "MAXIMUM", "NOVEL", "OPTION", "PACK", "PARK", "PLENTY", "QUARTER", "SKIN", "SORT", "WEIGHT", "BABY", "CARRY", "DISH", "FACTOR", "FRUIT", "GLASS", "JOINT", "MASTER", "MUSCLE", "STRENGTH", "TRAFFIC", "TRIP", "VEGETABLE", "APPEAL", "CHART", "GEAR", "IDEAL", "KITCHEN", "LAND", "MOTHER", "PARTY", "PRINCIPLE", "RELATIVE", "SALE", "SEASON", "SIGNAL", "SPIRIT", "STREET", "TREE", "WAVE", "BELT", "BENCH", "COPY", "DROP", "MINIMUM", "PATH", "PROGRESS", "PROJECT", "SOUTH", "STATUS", "STUFF", "TICKET", "TOUR", "ANGLE", "BLUE", "BREAKFAST", "DAUGHTER", "DEGREE", "DOCTOR", "DREAM", "DUTY", "ESSAY", "FATHER", "FINANCE", "HOUR", "JUICE", "LIMIT", "LUCK", "MILK", "MOUTH", "PEACE", "PIPE", "SEAT", "STABLE", "STORM", "SUBSTANCE", "TEAM", "TRICK", "AFTERNOON", "BEACH", "BLANK", "CATCH", "CHAIN", "CREAM", "CREW", "DETAIL", "GOLD", "INTERVIEW", "MARK", "MATCH", "MISSION", "PAIN", "PLEASURE", "SCORE", "SCREW", "SHOP", "SHOWER", "SUIT", "TONE", "WINDOW", "AGENT", "BAND", "BLOCK", "BONE", "CALENDAR", "COAT", "CONTEST", "CORNER", "COURT", "DISTRICT", "DOOR", "EAST", "FINGER", "GARAGE", "GUARANTEE", "HOLE", "HOOK", "IMPLEMENT", "LAYER", "LECTURE", "MANNER", "MEETING", "NOSE", "PARKING", "PARTNER", "PROFILE", "RESPECT", "RICE", "ROUTINE", "SCHEDULE", "SWIMMING", "TELEPHONE", "WINTER", "AIRLINE", "BATTLE", "BILL", "BOTHER", "CAKE", "CODE", "CURVE", "DESIGNER", "DIMENSION", "DRESS", "EASE", "EMERGENCY", "EVENING", "EXTENSION", "FARM", "FIGHT", "GRADE", "HOLIDAY", "HORROR", "HORSE", "HOST", "HUSBAND", "LOAN", "MISTAKE", "MOUNTAIN", "NAIL", "NOISE", "OCCASION", "PACKAGE", "PATIENT", "PAUSE", "PHRASE", "PROOF", "RACE", "RELIEF", "SAND", "SENTENCE", "SHOULDER", "SMOKE", "STOMACH", "STRING", "TOURIST", "TOWEL", "VACATION", "WEST", "WHEEL", "WINE", "ASIDE", "ASSOCIATE", "BLOW", "BORDER", "BRANCH", "BREAST", "BROTHER", "BUDDY", "BUNCH", "CHIP", "COACH", "CROSS", "DOCUMENT", "DRAFT", "DUST", "EXPERT", "FLOOR", "GOLF", "HABIT", "IRON", "JUDGE", "KNIFE", "LANDSCAPE", "LEAGUE", "MAIL", "MESS", "NATIVE", "OPENING", "PARENT", "PATTERN", "POOL", "POUND", "REQUEST", "SALARY", "SHAME", "SHELTER", "SHOE", "SILVER", "TACKLE", "TANK", "TRUST", "ASSIST", "BAKE", "BELL", "BIKE", "BLAME", "BRICK", "CHAIR", "CLOSET", "CLUE", "COLLAR", "COMMENT", "DEVIL", "DIET", "FEAR", "FUEL", "GLOVE", "JACKET", "LUNCH", "MONITOR", "MORTGAGE", "NURSE", "PACE", "PANIC", "PEAK", "PLANE", "REWARD", "SANDWICH", "SHOCK", "SPITE", "SPRAY", "SURPRISE", "TILL", "WEEKEND", "WELCOME", "YARD", "ALARM", "BEND", "BICYCLE", "BITE", "BLIND", "BOTTLE", "CABLE", "CANDLE", "CLERK", "CLOUD", "CONCERT", "COUNTER", "FLOWER", "HARM", "KNEE", "LAWYER", "LEATHER", "LOAD", "MIRROR", "NECK", "PENSION", "PLATE", "PURPLE", "RUIN", "SHIP", "SKIRT", "SLICE", "SNOW", "STROKE", "SWITCH", "TRASH", "TUNE", "ZONE", "ANGER", "AWARD", "BITTER", "BOOT", "CAMP", "CANDY", "CARPET", "CHAMPION", "CHANNEL", "CLOCK", "COMFORT", "CRACK", "ENGINEER", "ENTRANCE", "FAULT", "GRASS", "HELL", "HIGHLIGHT", "INCIDENT", "ISLAND", "JOKE", "JURY", "MATE", "MOTOR", "NERVE", "PASSAGE", "PRIDE", "PRIEST", "PRIZE", "PROMISE", "RESIDENT", "RESORT", "RING", "ROOF", "ROPE", "SAIL", "SCHEME", "SCRIPT", "SOCK", "STATION", "TOWER", "TRUCK", "WITNESS", "WILL", "MANY", "MOST", "OTHER", "MAKE", "GOOD", "LOOK", "HELP", "GREAT", "BEING", "MIGHT", "STILL", "PUBLIC", "READ", "KEEP", "START", "GIVE", "HUMAN", "LOCAL", "GENERAL", "SPECIFIC", "LONG", "PLAY", "FEEL", "HIGH", "TONIGHT", "COMMON", "CHANGE", "SIMPLE", "PAST", "POSSIBLE", "TODAY", "MAJOR", "PERSONAL", "CURRENT", "NATIONAL", "NATURAL", "PHYSICAL", "SHOW", "CHECK", "SECOND", "CALL", "MOVE", "INCREASE", "SINGLE", "TURN", "GUARD", "HOLD", "MAIN", "OFFER", "POTENTIAL", "TRAVEL", "COOK", "FOLLOWING", "SPECIAL", "WORKING", "WHOLE", "DANCE", "EXCUSE", "COLD", "PURCHASE", "DEAL", "PRIMARY", "WORTH", "FALL", "NECESSARY", "POSITIVE", "PRODUCE", "SEARCH", "PRESENT", "SPEND", "TALK", "CREATIVE", "TELL", "COST", "DRIVE", "GREEN", "SUPPORT", "GLAD", "REMOVE", "RETURN", "COMPLEX", "EFFECTIVE", "MIDDLE", "REGULAR", "RESERVE", "LEAVE", "ORIGINAL", "REACH", "REST", "SERVE", "WATCH", "BEAUTIFUL", "CHARGE", "ACTIVE", "BREAK", "NEGATIVE", "SAFE", "STAY", "VISIT", "VISUAL", "AFFECT", "COVER", "REPORT", "RISE", "WALK", "WHITE", "BEYOND", "JUNIOR", "PICK", "UNIQUE", "ANYTHING", "CLASSIC", "FINAL", "LIFT", "PRIVATE", "STOP", "TEACH", "WESTERN", "CONCERN", "FAMILIAR", "OFFICIAL", "BROAD", "GAIN", "MAYBE", "RICH", "SAVE", "STAND", "YOUNG", "FAIL", "HEAVY", "HELLO", "LEAD", "LISTEN", "VALUABLE", "WORRY", "HANDLE", "LEADING", "MEET", "RELEASE", "SELL", "FINISH", "NORMAL", "PRESS", "RIDE", "SECRET", "SPREAD", "SPRING", "TOUGH", "WAIT", "BROWN", "DEEP", "DISPLAY", "FLOW", "OBJECTIVE", "SHOOT", "TOUCH", "CANCEL", "CHEMICAL", "DUMP", "EXTREME", "PUSH", "CONFLICT", "FILL", "FORMAL", "JUMP", "KICK", "OPPOSITE", "PASS", "PITCH", "REMOTE", "TOTAL", "TREAT", "VAST", "ABUSE", "BEAT", "BURN", "DEPOSIT", "PRINT", "RAISE", "SLEEP", "SOMEWHERE", "ADVANCE", "ANYWHERE", "CONSIST", "DARK", "DOUBLE", "DRAW", "EQUAL", "HIRE", "INTERNAL", "JOIN", "KILL", "SENSITIVE", "ATTACK", "CLAIM", "CONSTANT", "DRAG", "DRINK", "GUESS", "MINOR", "PULL", "SOFT", "SOLID", "WEAR", "WEIRD", "WONDER", "ANNUAL", "COUNT", "DEAD", "DOUBT", "FEED", "FOREVER", "IMPRESS", "NOBODY", "REPEAT", "ROUND", "SING", "SLIDE", "STRIP", "WHEREAS", "WISH", "COMBINE", "COMMAND", "DIVIDE", "HANG", "HUNT", "INITIAL", "MARCH", "MENTION", "SMELL", "SPIRITUAL", "SURVEY", "ADULT", "BRIEF", "CRAZY", "ESCAPE", "GATHER", "HATE", "PRIOR", "REPAIR", "ROUGH", "SCRATCH", "SICK", "STRIKE", "EMPLOY", "EXTERNAL", "HURT", "ILLEGAL", "LAUGH", "MOBILE", "NASTY", "ORDINARY", "RESPOND", "ROYAL", "SENIOR", "SPLIT", "STRAIN", "STRUGGLE", "SWIM", "TRAIN", "UPPER", "WASH", "YELLOW", "CONVERT", "CRASH", "DEPENDENT", "FOLD", "FUNNY", "GRAB", "HIDE", "MISS", "PERMIT", "QUOTE", "RECOVER", "RESOLVE", "ROLL", "SINK", "SLIP", "SPARE", "SUSPECT", "SWEET", "SWING", "TWIST", "UPSTAIRS", "USUAL", "ABROAD", "BRAVE", "CALM", "ESTIMATE", "GRAND", "MALE", "MINE", "PROMPT", "QUIET", "REFUSE", "REGRET", "REVEAL", "RUSH", "SHAKE", "SHIFT", "SHINE", "STEAL", "SUCK", "SURROUND", "ANYBODY", "BEAR", "BRILLIANT", "DARE", "DEAR", "DELAY", "DRUNK", "FEMALE", "HURRY", "INVITE", "KISS", "NEAT", "PUNCH", "QUIT", "REPLY", "RESIST", "SILLY", "SMILE", "SPELL", "STRETCH", "STUPID", "TEAR", "TEMPORARY", "TOMORROW", "WAKE", "WRAP", "YESTERDAY"];

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
    guessesRemaining: 0,
    myName: ''
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
const createNameInput = document.getElementById('create-name');
const createTeamSelect = document.getElementById('create-team');
const createRoleSelect = document.getElementById('create-role');
const createBtn = document.getElementById('create-btn');
const joinNameInput = document.getElementById('join-name');
const joinIdInput = document.getElementById('join-id');
const joinTeamSelect = document.getElementById('join-team');
const joinRoleSelect = document.getElementById('join-role');
const joinBtn = document.getElementById('join-btn');

const activePlayersList = document.getElementById('active-players-list');

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
const playAgainBtn = document.getElementById('play-again-btn');

async function startNewGame() {
    gameState.myName = createNameInput.value.trim() || 'Anonymous';
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
    
    gameState.myName = joinNameInput.value.trim() || 'Anonymous';
    
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
    
    // Subscribe to realtime changes and presence
    if (realtimeSubscription) {
        await db.removeChannel(realtimeSubscription);
    }
    
    realtimeSubscription = db.channel(`room-${codeStr}`, {
      config: {
        presence: {
          key: gameState.myName + '_' + Math.random().toString(36).substring(7),
        },
      },
    });

    realtimeSubscription
      .on('presence', { event: 'sync' }, () => {
          const newState = realtimeSubscription.presenceState();
          updateActivePlayersUI(newState);
      })
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `game_code=eq.${codeStr}` },
        (payload) => {
            syncStateWithDB(payload.new);
        }
      )
      .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
              await realtimeSubscription.track({
                  name: gameState.myName,
                  team: gameState.myTeam,
                  role: gameState.myRole
              });
          }
      });
      
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
    } else if (!gameState.gameOver) {
        gameOverModal.classList.add('hidden');
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
    } else if (card.team === 'blue') {
        newBlueLeft--;
    } else if (card.team === 'black') {
        newGameOver = true;
        newWinnerMsg = 'Assassin revealed! ' + (gameState.turn === 'red' ? 'Blue' : 'Red') + ' Team Wins!';
        gameState.cards.forEach(c => c.revealed = true);
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

function updateActivePlayersUI(presenceState) {
    activePlayersList.innerHTML = '';
    
    // presenceState is an object where keys are presence keys, and values are arrays of state objects
    for (const key in presenceState) {
        const presences = presenceState[key];
        for (const player of presences) {
            const li = document.createElement('li');
            li.className = `player-item ${player.team}-team`;
            
            const roleEmoji = player.role === 'spymaster' ? '🕵️' : '🎯';
            li.innerHTML = `<span>${roleEmoji}</span> <strong>${player.name}</strong> <span>(${player.team} ${player.role})</span>`;
            
            activePlayersList.appendChild(li);
        }
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
    
    await db.from('games').update({
        chat_log: updatedLog,
        guesses_remaining: number
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

playAgainBtn.addEventListener('click', async () => {
    playAgainBtn.disabled = true;
    playAgainBtn.textContent = 'Restarting...';
    
    // Generate new cards
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
    
    // Update the existing row in Supabase
    await db.from('games').update({
        board_cards: generatedCards,
        turn: 'red',
        red_left: 12,
        blue_left: 12,
        chat_log: [{ type: 'system', text: 'Game restarted!' }],
        game_over: false,
        winner_message: '',
        guesses_remaining: 0
    }).eq('game_code', gameState.game_code);
    
    playAgainBtn.disabled = false;
    playAgainBtn.textContent = '🔄 Play Again';
    
    // Realtime subscription will automatically pick up the change and sync State!
});

// Rules Modal Logic
const rulesModal = document.getElementById('rules-modal');
const rulesBtnLobby = document.getElementById('rules-btn-lobby');
const rulesBtnGame = document.getElementById('rules-btn-game');
const closeRulesBtn = document.getElementById('close-rules-btn');

rulesBtnLobby.addEventListener('click', () => rulesModal.classList.remove('hidden'));
rulesBtnGame.addEventListener('click', () => rulesModal.classList.remove('hidden'));
closeRulesBtn.addEventListener('click', () => rulesModal.classList.add('hidden'));
