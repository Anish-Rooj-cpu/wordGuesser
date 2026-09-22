// REPLACE THESE WITH YOUR SUPABASE DETAILS
const https://hqlzsolcpqkvlithwpqk.supabase.co;
const SUPABASE_ANON_KEY = 'sb_publishable_9vFkZLa0aOjbbfcdW_XkOg_T7lMITtd';

// Initialize Supabase Client
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const words = ["PEOPLE", "HISTORY", "WORLD", "FAMILY", "HEALTH", "SYSTEM", "COMPUTER", "MEAT", "YEAR", "MUSIC", "PERSON", "READING", "METHOD", "DATA", "FOOD", "THEORY", "BIRD", "PROBLEM", "SOFTWARE", "CONTROL", "KNOWLEDGE", "POWER", "ABILITY", "ECONOMICS", "LOVE", "INTERNET", "SCIENCE", "LIBRARY", "NATURE", "FACT", "PRODUCT", "IDEA", "AREA", "SOCIETY", "ACTIVITY", "STORY", "INDUSTRY", "MEDIA", "THING", "OVEN", "COMMUNITY", "SAFETY", "QUALITY", "LANGUAGE", "PLAYER", "VARIETY", "VIDEO", "WEEK", "SECURITY", "COUNTRY", "EXAM", "MOVIE", "EQUIPMENT", "PHYSICS", "ANALYSIS", "POLICY", "SERIES", "THOUGHT", "BASIS", "BOYFRIEND", "DIRECTION", "STRATEGY", "ARMY", "CAMERA", "FREEDOM", "PAPER", "CHILD", "INSTANCE", "MONTH", "TRUTH", "MARKETING", "WRITING", "ARTICLE", "GOAL", "NEWS", "AUDIENCE", "FISHING", "GROWTH", "INCOME", "MARRIAGE", "USER", "FAILURE", "MEANING", "MEDICINE", "TEACHER", "NIGHT", "CHEMISTRY", "DISEASE", "DISK", "ENERGY", "NATION", "ROAD", "ROLE", "SOUP", "LOCATION", "SUCCESS", "ADDITION", "APARTMENT", "EDUCATION", "MATH", "MOMENT", "PAINTING", "POLITICS", "ATTENTION", "DECISION", "EVENT", "PROPERTY", "SHOPPING", "STUDENT", "WOOD", "OFFICE", "PRESIDENT", "UNIT", "CATEGORY", "CIGARETTE", "CONTEXT", "DRIVER", "FLIGHT", "LENGTH", "MAGAZINE", "NEWSPAPER", "TEACHING", "CELL", "DEALER", "FINDING", "LAKE", "MEMBER", "MESSAGE", "PHONE", "SCENE", "CONCEPT", "CUSTOMER", "DEATH", "HOUSING", "INFLATION", "INSURANCE", "MOOD", "WOMAN", "ADVICE", "BLOOD", "EFFORT", "OPINION", "PAYMENT", "REALITY", "SITUATION", "SKILL", "STATEMENT", "WEALTH", "CITY", "COUNTY", "DEPTH", "ESTATE", "HEART", "PHOTO", "RECIPE", "STUDIO", "TOPIC", "PASSION", "RESOURCE", "SETTING", "AGENCY", "COLLEGE", "CRITICISM", "DEBT", "MEMORY", "PATIENCE", "SECRETARY", "SOLUTION", "ASPECT", "ATTITUDE", "DIRECTOR", "RESPONSE", "SELECTION", "STORAGE", "VERSION", "ALCOHOL", "ARGUMENT", "COMPLAINT", "CONTRACT", "EMPHASIS", "HIGHWAY", "LOSS", "STEAK", "UNION", "AGREEMENT", "CANCER", "CURRENCY", "ENTRY", "MIXTURE", "REGION", "REPUBLIC", "TRADITION", "VIRUS", "ACTOR", "CLASSROOM", "DELIVERY", "DEVICE", "DRAMA", "ELECTION", "ENGINE", "FOOTBALL", "GUIDANCE", "HOTEL", "OWNER", "PRIORITY", "TENSION", "VARIATION", "ANXIETY", "AWARENESS", "BATH", "BREAD", "CANDIDATE", "CLIMATE", "CONFUSION", "ELEVATOR", "EMOTION", "EMPLOYEE", "EMPLOYER", "GUEST", "HEIGHT", "MALL", "MANAGER", "OPERATION", "RECORDING", "SAMPLE", "CHARITY", "COUSIN", "DISASTER", "EDITOR", "EXTENT", "FEEDBACK", "GUITAR", "HOMEWORK", "LEADER", "OUTCOME", "PROMOTION", "REVENUE", "SESSION", "SINGER", "TENNIS", "BASKET", "BONUS", "CABINET", "CHILDHOOD", "CHURCH", "CLOTHES", "COFFEE", "DINNER", "DRAWING", "HAIR", "HEARING", "JUDGMENT", "MODE", "ORANGE", "POETRY", "POLICE", "PROCEDURE", "QUEEN", "RATIO", "RELATION", "SECTOR", "SIGNATURE", "SONG", "TOOTH", "TOWN", "VEHICLE", "VOLUME", "WIFE", "ACCIDENT", "AIRPORT", "ARRIVAL", "BASEBALL", "CHAPTER", "COMMITTEE", "DATABASE", "ERROR", "FARMER", "GATE", "GIRL", "HALL", "HISTORIAN", "HOSPITAL", "INJURY", "MEAL", "POEM", "PRESENCE", "PROPOSAL", "RECEPTION", "RIVER", "SPEECH", "VILLAGE", "WARNING", "WINNER", "WORKER", "WRITER", "BREATH", "BUYER", "CHEST", "CHOCOLATE", "COOKIE", "COURAGE", "DESK", "DRAWER", "GARBAGE", "GROCERY", "HONEY", "INSECT", "INSPECTOR", "KING", "LADDER", "MENU", "PENALTY", "PIANO", "POTATO", "PROFESSOR", "QUANTITY", "REACTION", "SALAD", "SISTER", "TONGUE", "WEAKNESS", "WEDDING", "AFFAIR", "AMBITION", "ANALYST", "APPLE", "ASSISTANT", "BATHROOM", "BEDROOM", "BEER", "BIRTHDAY", "CHEEK", "CLIENT", "DEPARTURE", "DIAMOND", "DIRT", "FORTUNE", "FUNERAL", "GENE", "INTENTION", "LADY", "MIDNIGHT", "PASSENGER", "PIZZA", "PLATFORM", "POET", "POLLUTION", "SHIRT", "SPEAKER", "STRANGER", "SURGERY", "SYMPATHY", "TALE", "THROAT", "TRAINER", "UNCLE", "YOUTH", "TIME", "WORK", "FILM", "WATER", "MONEY", "EXAMPLE", "BUSINESS", "STUDY", "GAME", "LIFE", "FORM", "PLACE", "NUMBER", "PART", "FIELD", "FISH", "BACK", "PROCESS", "HEAT", "HAND", "BOOK", "POINT", "TYPE", "HOME", "ECONOMY", "VALUE", "BODY", "MARKET", "GUIDE", "INTEREST", "STATE", "RADIO", "COURSE", "COMPANY", "PRICE", "SIZE", "CARD", "LIST", "MIND", "TRADE", "LINE", "CARE", "GROUP", "RISK", "WORD", "FORCE", "LIGHT", "TRAINING", "NAME", "SCHOOL", "AMOUNT", "LEVEL", "ORDER", "PRACTICE", "RESEARCH", "SENSE", "SERVICE", "PIECE", "BOSS", "SPORT", "HOUSE", "PAGE", "TERM", "TEST", "ANSWER", "SOUND", "FOCUS", "MATTER", "KIND", "SOIL", "BOARD", "PICTURE", "ACCESS", "GARDEN", "RANGE", "RATE", "REASON", "FUTURE", "SITE", "DEMAND", "EXERCISE", "IMAGE", "CASE", "CAUSE", "COAST", "ACTION", "BOAT", "RECORD", "RESULT", "SECTION", "BUILDING", "MOUSE", "CASH", "CLASS", "PERIOD", "PLAN", "STORE", "SIDE", "SUBJECT", "SPACE", "RULE", "STOCK", "WEATHER", "CHANCE", "FIGURE", "MODEL", "SOURCE", "BEGINNING", "EARTH", "PROGRAM", "CHICKEN", "DESIGN", "FEATURE", "HEAD", "MATERIAL", "PURPOSE", "QUESTION", "ROCK", "SALT", "BIRTH", "OBJECT", "SCALE", "NOTE", "PROFIT", "RENT", "SPEED", "STYLE", "BANK", "CRAFT", "STANDARD", "EXCHANGE", "FIRE", "POSITION", "PRESSURE", "STRESS", "ADVANTAGE", "BENEFIT", "FRAME", "ISSUE", "STEP", "CYCLE", "FACE", "ITEM", "METAL", "PAINT", "REVIEW", "ROOM", "SCREEN", "STRUCTURE", "VIEW", "ACCOUNT", "BALL", "MEDIUM", "SHARE", "BALANCE", "BOTTOM", "CHOICE", "GIFT", "IMPACT", "MACHINE", "SHAPE", "TOOL", "WIND", "ADDRESS", "CAREER", "CULTURE", "MORNING", "SIGN", "TABLE", "TASK", "CONDITION", "CONTACT", "CREDIT", "HOPE", "NETWORK", "NORTH", "SQUARE", "ATTEMPT", "DATE", "EFFECT", "LINK", "POST", "STAR", "VOICE", "CAPITAL", "CHALLENGE", "FRIEND", "SHOT", "BRUSH", "DEBATE", "EXIT", "FRONT", "FUNCTION", "LACK", "PLANT", "PLASTIC", "SPOT", "SUMMER", "TASTE", "THEME", "TRACK", "WING", "BRAIN", "BUTTON", "CLICK", "DESIRE", "FOOT", "INFLUENCE", "NOTICE", "RAIN", "WALL", "BASE", "DAMAGE", "DISTANCE", "FEELING", "PAIR", "SAVINGS", "STAFF", "SUGAR", "TARGET", "TEXT", "ANIMAL", "AUTHOR", "BUDGET", "DISCOUNT", "FILE", "GROUND", "LESSON", "MINUTE", "OFFICER", "PHASE", "REFERENCE", "REGISTER", "STAGE", "STICK", "TITLE", "TROUBLE", "BOWL", "BRIDGE", "CAMPAIGN", "CHARACTER", "CLUB", "EDGE", "EVIDENCE", "LETTER", "LOCK", "NOVEL", "OPTION", "PACK", "PARK", "QUARTER", "SKIN", "SORT", "WEIGHT", "BABY", "DISH", "FACTOR", "FRUIT", "GLASS", "JOINT", "MASTER", "MUSCLE", "STRENGTH", "TRAFFIC", "TRIP", "VEGETABLE", "APPEAL", "CHART", "GEAR", "IDEAL", "KITCHEN", "LAND", "MOTHER", "PARTY", "PRINCIPLE", "RELATIVE", "SALE", "SEASON", "SIGNAL", "SPIRIT", "STREET", "TREE", "WAVE", "BELT", "BENCH", "COPY", "DROP", "PATH", "PROGRESS", "PROJECT", "SOUTH", "STATUS", "STUFF", "TICKET", "TOUR", "ANGLE", "BREAKFAST", "DAUGHTER", "DEGREE", "DOCTOR", "DREAM", "DUTY", "ESSAY", "FATHER", "FINANCE", "HOUR", "JUICE", "LIMIT", "LUCK", "MILK", "MOUTH", "PEACE", "PIPE", "SEAT", "STABLE", "STORM", "SUBSTANCE", "TEAM", "TRICK", "AFTERNOON", "BEACH", "BLANK", "CATCH", "CHAIN", "CREAM", "CREW", "DETAIL", "GOLD", "INTERVIEW", "MARK", "MATCH", "MISSION", "PAIN", "PLEASURE", "SCORE", "SCREW", "SHOP", "SHOWER", "SUIT", "TONE", "WINDOW", "AGENT", "BAND", "BLOCK", "BONE", "CALENDAR", "COAT", "CONTEST", "CORNER", "COURT", "DISTRICT", "DOOR", "EAST", "FINGER", "GARAGE", "GUARANTEE", "HOLE", "HOOK", "IMPLEMENT", "LAYER", "LECTURE", "MANNER", "MEETING", "NOSE", "PARKING", "PARTNER", "PROFILE", "RESPECT", "RICE", "ROUTINE", "SCHEDULE", "SWIMMING", "TELEPHONE", "WINTER", "AIRLINE", "BATTLE", "BILL", "CAKE", "CODE", "CURVE", "DESIGNER", "DIMENSION", "DRESS", "EASE", "EMERGENCY", "EVENING", "EXTENSION", "FARM", "FIGHT", "GRADE", "HOLIDAY", "HORROR", "HORSE", "HOST", "HUSBAND", "LOAN", "MISTAKE", "MOUNTAIN", "NAIL", "NOISE", "OCCASION", "PACKAGE", "PATIENT", "PHRASE", "PROOF", "RACE", "RELIEF", "SAND", "SENTENCE", "SHOULDER", "SMOKE", "STOMACH", "STRING", "TOURIST", "TOWEL", "VACATION", "WEST", "WHEEL", "WINE", "ASSOCIATE", "BORDER", "BRANCH", "BREAST", "BROTHER", "BUDDY", "BUNCH", "CHIP", "COACH", "CROSS", "DOCUMENT", "DRAFT", "DUST", "EXPERT", "FLOOR", "GOLF", "HABIT", "IRON", "JUDGE", "KNIFE", "LANDSCAPE", "LEAGUE", "MAIL", "MESS", "NATIVE", "OPENING", "PARENT", "PATTERN", "POOL", "POUND", "REQUEST", "SALARY", "SHAME", "SHELTER", "SHOE", "SILVER", "TACKLE", "TANK", "TRUST", "BELL", "BIKE", "BRICK", "CHAIR", "CLOSET", "CLUE", "COLLAR", "COMMENT", "DEVIL", "DIET", "FEAR", "FUEL", "GLOVE", "JACKET", "LUNCH", "MONITOR", "MORTGAGE", "NURSE", "PACE", "PANIC", "PEAK", "PLANE", "REWARD", "SANDWICH", "SHOCK", "SPRAY", "WEEKEND", "YARD", "ALARM", "BICYCLE", "BITE", "BLIND", "BOTTLE", "CABLE", "CANDLE", "CLERK", "CLOUD", "CONCERT", "COUNTER", "FLOWER", "HARM", "KNEE", "LAWYER", "LEATHER", "LOAD", "MIRROR", "NECK", "PENSION", "PLATE", "PURPLE", "SHIP", "SKIRT", "SLICE", "SNOW", "STROKE", "SWITCH", "TRASH", "TUNE", "ZONE", "ANGER", "AWARD", "BITTER", "BOOT", "CAMP", "CANDY", "CARPET", "CHAMPION", "CHANNEL", "CLOCK", "COMFORT", "CRACK", "ENGINEER", "ENTRANCE", "FAULT", "GRASS", "HELL", "HIGHLIGHT", "INCIDENT", "ISLAND", "JOKE", "JURY", "MATE", "MOTOR", "NERVE", "PASSAGE", "PRIDE", "PRIEST", "PRIZE", "PROMISE", "RESIDENT", "RESORT", "RING", "ROOF", "ROPE", "SAIL", "SCHEME", "SCRIPT", "SOCK", "STATION", "TOWER", "TRUCK", "WITNESS", "GUARD", "WATCH", "SPRING", "PITCH", "SLIDE", "STRIP", "TRAIN", "ROLL", "MINE", "BEAR", "PUNCH"];

let gameState = { code: '', teams: 2, grid: 5, cards: [], cardsLeft: {}, turn: 'red', guessesRemaining: 0, eliminated: [],
                  chatLog: [], gameOver: false, winner: '', turnSeconds: 0, turnStartedAt: 0, myName: '', myTeam: 'red', myRole: 'guesser', gameMode: 'normal',
                  isHost: false, hostName: '', timerStarted: false };
let channel = null;

// DOM
const $ = (id) => document.getElementById(id);
const lobbyScreen = $('lobby-screen'), gameScreen = $('game-screen'), boardEl = $('board');
const scoreboardEl = $('scoreboard'), chatLogEl = $('chat-log'), toastEl = $('toast');
const playerInfoBadge = $('player-info-badge'), displayGameMode = $('display-game-mode'), activePlayersList = $('active-players-list');
const createTeamsSelect = $('create-teams'), createTeamSelect = $('create-team'), createModeSelect = $('create-mode');
const createBtn = $('create-btn'), joinBtn = $('join-btn'), joinIdInput = $('join-id');
const endTurnBtn = $('end-turn-btn'), leaveBtn = $('leave-btn');
const hintControls = $('hint-controls'), hintWordInput = $('hint-word'), hintNumberInput = $('hint-number'), submitHintBtn = $('submit-hint');
const chatControls = $('chat-controls'), chatTextInput = $('chat-text'), submitChatBtn = $('submit-chat');
const suspenseControls = $('suspense-controls'), suspenseCountEl = $('suspense-count');
const submitGuessesBtn = $('submit-guesses-btn'), clearSelectionBtn = $('clear-selection-btn');
const gameOverModal = $('game-over-modal'), winnerText = $('winner-text');
const playAgainBtn = $('play-again-btn'), returnLobbyBtn = $('return-lobby-btn');
const rulesModal = $('rules-modal'), closeRulesBtn = $('close-rules-btn'), srLive = $('sr-live');
const connectError = $('connect-error'), connectRetry = $('connect-retry'), connectLeave = $('connect-leave');
const themeToggleLobby = $('theme-toggle-lobby'), themeToggleGame = $('theme-toggle-game');
const roleToggleBtn = $('role-toggle-btn'), teamSpymasterBanner = $('team-spymaster-banner');
const startTimerBtn = $('start-timer-btn');
const selectedCards = new Set();

// ── Theme management ──
function getPreferredTheme() {
    try {
        const saved = localStorage.getItem('codenames-theme');
        if (saved === 'light' || saved === 'dark') return saved;
    } catch (e) { /* storage unavailable */ }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', theme === 'light' ? '#f8fafc' : '#0f1117');
    const isLight = theme === 'light';
    const text = isLight ? '☀️ Light' : '🌙 Dark';
    const label = isLight ? 'Switch to dark theme' : 'Switch to light theme';
    [themeToggleLobby, themeToggleGame].forEach((btn) => {
        if (btn) {
            btn.textContent = text;
            btn.setAttribute('aria-label', label);
            btn.title = label;
        }
    });
}

function toggleTheme() {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    try { localStorage.setItem('codenames-theme', next); } catch (e) { /* storage unavailable */ }
    applyTheme(next);
    announce(`Theme switched to ${next} mode`);
}
applyTheme(getPreferredTheme());

// ── Helpers (TEAMS, MODES, HINT_RE, shuffle, generateBoard live in game-core.js) ──
function makeCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => chars[b % 32]).join('');
}

// Polite screen-reader announcement. Cleared first so a repeated message is read again.
let srTimer = null;
function announce(text) {
    srLive.textContent = '';
    clearTimeout(srTimer);
    srTimer = setTimeout(() => { srLive.textContent = text; }, 30);
}

// The toast is visual only (aria-hidden); its text is announced through #sr-live.
let toastTimer = null;
function hideToast() { clearTimeout(toastTimer); toastEl.classList.add('hidden'); }
function showToast(msg, kind = 'error') {
    toastEl.textContent = msg;
    toastEl.className = `toast ${kind}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, Math.max(5000, msg.length * 80)); // longer messages stay longer
    announce(msg);
}
toastEl.addEventListener('click', hideToast);

// ── Modal focus ──
const openModals = () => [rulesModal, gameOverModal].filter((m) => !m.classList.contains('hidden'));
// Keep Tab inside the top-most open dialog.
document.addEventListener('keydown', (e) => {
    const open = openModals()[0];
    if (e.key !== 'Tab' || !open) return;
    const f = [...open.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((el) => !el.disabled);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1], at = document.activeElement;
    if (!open.contains(at)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && at === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && at === last) { e.preventDefault(); first.focus(); }
});
let gameOverOpener = null;
function closeGameOver() {
    if (gameOverModal.classList.contains('hidden')) return;
    gameOverModal.classList.add('hidden');
    const o = gameOverOpener;
    gameOverOpener = null;
    (o && o.isConnected && !o.disabled ? o : boardEl).focus(); // board container if the opener was rebuilt
}

async function rpc(name, args) {
    const { data, error } = await db.rpc(name, args);
    if (error) { showToast(error.message); return null; }
    syncStateWithDB(data);
    return data;
}

function saveSession() {
    try {
        sessionStorage.setItem('wg_session', JSON.stringify({
            code: gameState.code, name: gameState.myName, team: gameState.myTeam, role: gameState.myRole, isHost: gameState.isHost }));
    } catch (e) { /* storage unavailable */ }
}
function loadSession() {
    try { return JSON.parse(sessionStorage.getItem('wg_session')); } catch (e) { return null; }
}
function clearSession() {
    try { sessionStorage.removeItem('wg_session'); } catch (e) { /* storage unavailable */ }
}

const teamLabel = (t) => String(t ?? '').toUpperCase();

function swapScreens(inGame) {
    lobbyScreen.classList.toggle('hidden', inGame);
    gameScreen.classList.toggle('hidden', !inGame);
}

// ── Lobby ──
function syncTeamOptions() {
    const count = parseInt(createTeamsSelect.value, 10);
    [...createTeamSelect.options].forEach((o, i) => { o.hidden = i >= count; });
    if (createTeamSelect.selectedIndex >= count) createTeamSelect.selectedIndex = 0;
}
createTeamsSelect.addEventListener('change', syncTeamOptions);
syncTeamOptions();

const urlCode = new URLSearchParams(location.search).get('code');
if (urlCode) joinIdInput.value = urlCode.toUpperCase().slice(0, 6);

async function createGame() {
    const name = $('create-name').value.trim().slice(0, 20) || 'Anonymous';
    const teams = parseInt(createTeamsSelect.value, 10);
    const gameMode = createModeSelect ? createModeSelect.value : 'normal';
    const team = createTeamSelect.value, role = 'guesser';
    const turnSeconds = parseInt($('create-timer').value, 10) || 0;
    const cards = generateBoard(teams);
    const cardsLeft = {};
    cards.forEach((c) => { if (c.team !== 'neutral' && c.team !== 'black') cardsLeft[c.team] = (cardsLeft[c.team] || 0) + 1; });
    const turn = TEAMS[Math.floor(Math.random() * teams)];

    createBtn.disabled = true;
    createBtn.textContent = 'Creating...';
    try {
        let data = null, error = null;
        for (let attempt = 0; attempt < 2; attempt++) {
            const payload = {
                game_code: makeCode(), teams, grid: MODES[teams].grid, board_cards: cards, cards_left: cardsLeft, turn, turn_seconds: turnSeconds,
                game_mode: gameMode,
                host_name: name,
                timer_started: turnSeconds === 0,
                chat_log: [{ type: 'system', text: `Game created. ${teamLabel(turn)} starts.` }]
            };
            ({ data, error } = await db.from('games').insert(payload).select().single());
            if (error && (error.code === 'PGRST204' || /game_mode|host_name|timer_started/.test(error.message))) {
                delete payload.game_mode;
                delete payload.host_name;
                delete payload.timer_started;
                ({ data, error } = await db.from('games').insert(payload).select().single());
                if (data && !data.game_mode) data.game_mode = gameMode;
            }
            if (!error || error.code !== '23505') break;
        }
        if (error) { showToast(error.message); return; }
        try { sessionStorage.setItem('wg_is_host_' + data.game_code, 'true'); } catch (e) {}
        await enterGame(data, { name, team, role, isHost: true });
    } finally {
        createBtn.disabled = false;
        createBtn.textContent = 'Create Game';
    }
}

async function joinGame({ code, name, team, role, isHost }) {
    role = role || 'guesser';
    code = (code || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) { showToast('Enter a 6-character code'); return; }
    const { data, error } = await db.from('games').select('*').eq('game_code', code).maybeSingle();
    if (error) { showToast(error.message); return; }
    if (!data) { clearSession(); showToast('Game not found'); return; }
    if (TEAMS.indexOf(team) >= data.teams) { showToast(`This game has ${data.teams} teams`); return; }
    let hostFlag = !!isHost;
    try { if (sessionStorage.getItem('wg_is_host_' + code) === 'true') hostFlag = true; } catch (e) {}
    if (data.host_name && data.host_name === name) hostFlag = true;
    await enterGame(data, { name, team, role, isHost: hostFlag });
}

// ── Room ──
function subscribeToRoom(code) {
    return new Promise((resolve, reject) => {
        const ch = channel = db.channel(`room-${code}`, {
            config: { presence: { key: `${gameState.myName}_${Math.random().toString(36).slice(2, 8)}` } }
        });
        let up = false;
        ch
            .on('presence', { event: 'sync' }, renderRoster)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `game_code=eq.${code}` },
                (payload) => syncStateWithDB(payload.new))
            .subscribe((status) => {
                if (ch !== channel) return; // replaced or left: ignore the CLOSED that removeChannel emits
                if (status === 'SUBSCRIBED') { up = true; resolve(); }
                else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                    if (up) reconnect(); else reject(new Error(status));
                }
            });
    });
}

async function dropChannel() {
    const old = channel;
    channel = null; // before removal, so its CLOSED status is ignored
    if (old) await db.removeChannel(old);
}

// One channel at a time: drop the old, subscribe, announce presence, re-read the row.
async function connect(code) {
    await dropChannel();
    await subscribeToRoom(code);
    await channel.track({ name: gameState.myName, team: gameState.myTeam, role: gameState.myRole });
    const { data, error } = await db.from('games').select('*').eq('game_code', code).single();
    if (error) throw new Error(error.message);
    syncStateWithDB(data);
}

// First connection to a room. On failure the player gets a Retry / Back to lobby panel instead of a blank board.
function showConnectError(show) {
    connectError.classList.toggle('hidden', !show);
    if (show) { announce('Could not connect to the room. Retry, or go back to the lobby.'); connectRetry.focus(); }
}
async function firstConnect(code) {
    showConnectError(false);
    document.body.classList.add('connecting');
    boardEl.setAttribute('aria-busy', 'true');
    try {
        await connect(code);
    } catch (e) {
        showToast('Could not connect to the room');
        showConnectError(true);
    } finally {
        document.body.classList.remove('connecting');
        boardEl.removeAttribute('aria-busy');
    }
}

let reconnecting = false, roomToken = 0, wakeRetry = null, reconnectEl = null;

function setReconnectMsg(text) {
    if (!text) { if (reconnectEl) reconnectEl.remove(); reconnectEl = null; return; }
    if (!reconnectEl) {
        reconnectEl = document.createElement('div');
        reconnectEl.className = 'hint-msg system reconnecting';
    }
    reconnectEl.textContent = text;
    announce(text);
    chatLogEl.appendChild(reconnectEl);
    chatLogEl.scrollTop = chatLogEl.scrollHeight;
}

async function reconnect() {
    if (reconnecting) return;
    reconnecting = true;
    const token = roomToken, code = gameState.code;
    setReconnectMsg('Reconnecting…');
    try {
        for (let i = 0; i < 10; i++) {
            await new Promise((r) => { wakeRetry = r; setTimeout(r, Math.min(1000 * 2 ** i, 30000)); }); // 1s, 2s, 4s … 30s
            wakeRetry = null;
            if (token !== roomToken) return; // left the room meanwhile
            try { await connect(code); setReconnectMsg(''); announce('Reconnected'); return; } catch (e) { /* retry */ }
        }
        setReconnectMsg('Connection lost — reload the page');
    } finally {
        reconnecting = false;
    }
}
window.addEventListener('online', () => { if (wakeRetry) wakeRetry(); });

async function enterGame(row, { name, team, role, isHost = false }) {
    document.body.classList.add('connecting');
    boardEl.setAttribute('aria-busy', 'true');
    announcedLog = null;
    seen = null;
    try {
        role = role || 'guesser';
        let hostFlag = !!isHost;
        try { if (sessionStorage.getItem('wg_is_host_' + row.game_code) === 'true') hostFlag = true; } catch (e) {}
        if (row.host_name && row.host_name === (name || 'Anonymous')) hostFlag = true;
        Object.assign(gameState, {
            code: row.game_code,
            myName: name || 'Anonymous',
            myTeam: team,
            myRole: role,
            isHost: hostFlag,
            hostName: row.host_name || ''
        });
        saveSession();
        history.replaceState(null, '', '?code=' + row.game_code);

        swapScreens(true);
        boardEl.focus(); // the lobby just disappeared; keep keyboard/screen-reader users in the game
        $('display-game-id').textContent = row.game_code;
        if (displayGameMode) {
            const mode = row.game_mode || 'normal';
            displayGameMode.textContent = mode.toUpperCase();
            displayGameMode.className = `badge badge-mode ${mode}`;
        }
        document.body.classList.toggle('spymaster', role === 'spymaster');
        hintControls.classList.toggle('hidden', role !== 'spymaster');
        chatControls.classList.toggle('hidden', role === 'spymaster');
        gameOverModal.classList.add('hidden');

        scoreboardEl.replaceChildren();
        TEAMS.slice(0, row.teams).forEach((t, i) => {
            const score = document.createElement('span');
            score.className = 'score';
            score.dataset.team = t;
            const dot = document.createElement('span');
            dot.className = 'score-dot';
            dot.textContent = '●';
            dot.setAttribute('aria-hidden', 'true');
            const sr = document.createElement('span');
            sr.className = 'sr-only score-sr';
            const n = document.createElement('span');
            n.className = 'score-n';
            score.append(dot, ' ', sr, n);
            scoreboardEl.appendChild(score);
            if (i === 0) {
                const pill = document.createElement('span');
                pill.className = 'turn-pill';
                pill.id = 'turn-indicator';
                pill.setAttribute('aria-live', 'polite');
                pill.setAttribute('aria-atomic', 'true');
                const timer = document.createElement('span');
                timer.className = 'turn-timer hidden';
                timer.id = 'turn-timer';
                timer.setAttribute('role', 'timer');
                scoreboardEl.append(pill, timer);
            }
        });

        updateRoleControls();
        roomToken++;
        setReconnectMsg('');
        boardEl.replaceChildren(); // nothing from a previously joined room may show while connecting or after a failure
        chatLogEl.replaceChildren();
        activePlayersList.replaceChildren();
        await firstConnect(row.game_code);
    } finally {
        document.body.classList.remove('connecting');
        boardEl.removeAttribute('aria-busy');
    }
}

async function leaveGame() {
    roomToken++;
    setReconnectMsg('');
    await dropChannel();
    clearSession();
    history.replaceState(null, '', location.pathname);
    selectedCards.clear();
    updateSuspenseControls();
    updateStartTimerControl();
    swapScreens(false);
    gameOverOpener = null;
    gameOverModal.classList.add('hidden');
    rulesModal.classList.add('hidden');
    document.body.classList.remove('spymaster', 'can-guess');
    announcedLog = null;
    seen = null;
    showConnectError(false);
    updateRoleControls();
    $('create-name').focus();
}

// ── Sync and render ──
// Ordering guard. RPC responses and realtime events can arrive in any order, so an older row must never replace a newer one.
// Within one board every server action either reveals a card or adds a chat line, so (revealed + chat lines) only grows.
// A restart brings a new board, where the later updated_at wins. (updated_at alone is not enough: now() is the transaction's
// start time, so two racing updates can be stamped out of order.)
const boardSig = (row) => (Array.isArray(row.board_cards) ? row.board_cards.map((c) => c && c.word).join('|') : '');
const stateRank = (row) => (Array.isArray(row.board_cards) ? row.board_cards.filter((c) => c && c.revealed).length : 0)
    + (Array.isArray(row.chat_log) ? row.chat_log.length : 0);
const stamp = (row) => (row.updated_at ? new Date(row.updated_at).getTime() : NaN);
let seen = null; // {sig, rank, at} of the newest state applied in this room
function isStale(row) {
    if (!seen) return false;
    if (boardSig(row) === seen.sig) return stateRank(row) <= seen.rank; // same board: equal rank is the same state
    return stamp(row) < seen.at; // new board (restart); NaN compares false, so undated rows still apply
}

function syncStateWithDB(row) {
    if (isStale(row)) return;
    const wasGameOver = gameState.gameOver;
    const isRestart = (wasGameOver && !row.game_over) || (seen && boardSig(row) !== seen.sig && !row.game_over);
    seen = { sig: boardSig(row), rank: stateRank(row), at: stamp(row) || 0 };
    const prevTurn = gameState.turn;

    // Check if chat log has a timer start notification (system or chat fallback)
    const hasTimerChat = Array.isArray(row.chat_log) && row.chat_log.some((m) =>
        m && (m.type === 'timer_start' || (typeof m.text === 'string' && m.text.toLowerCase().includes('timer started')))
    );

    let timerStarted = false;
    if ((row.turn_seconds || 0) === 0) {
        timerStarted = true;
    } else if (isRestart) {
        timerStarted = !!row.timer_started;
    } else if (gameState.timerStarted) {
        // Once started for this round, do not revert to false on chats or card clicks
        timerStarted = true;
    } else if (row.timer_started || hasTimerChat) {
        timerStarted = true;
    } else {
        timerStarted = false;
    }

    const turnChanged = !!prevTurn && prevTurn !== row.turn;
    const justStartedViaFallback = !gameState.timerStarted && timerStarted && !row.timer_started;
    let turnStartedAt = gameState.turnStartedAt;
    if (!turnStartedAt || turnChanged || isRestart || justStartedViaFallback) {
        turnStartedAt = row.turn_started_at && !justStartedViaFallback ? new Date(row.turn_started_at).getTime() : Date.now();
    } else if (row.turn_started_at) {
        const sTime = new Date(row.turn_started_at).getTime();
        if (!isNaN(sTime) && sTime > turnStartedAt) {
            turnStartedAt = sTime;
        }
    }

    Object.assign(gameState, {
        cards: row.board_cards,
        cardsLeft: row.cards_left || { red: row.red_left, blue: row.blue_left }, // old-row fallback
        turn: row.turn,
        gameMode: row.game_mode || 'normal',
        guessesRemaining: row.guesses_remaining || 0,
        eliminated: row.eliminated || [],
        chatLog: Array.isArray(row.chat_log) ? row.chat_log : [],
        gameOver: row.game_over,
        winner: row.winner || '',
        teams: row.teams || 2,
        grid: row.grid || 5,
        turnSeconds: row.turn_seconds || 0,
        turnStartedAt,
        hostName: row.host_name || gameState.hostName || '',
        timerStarted: !!timerStarted
    });
    if (row.host_name && row.host_name === gameState.myName) {
        gameState.isHost = true;
    }
    if (isRestart) {
        setRole('guesser');
    }
    if (displayGameMode) {
        displayGameMode.textContent = gameState.gameMode.toUpperCase();
        displayGameMode.className = `badge badge-mode ${gameState.gameMode}`;
    }
    if (prevTurn !== gameState.turn || !canGuess()) {
        selectedCards.clear();
    } else {
        for (const idx of selectedCards) {
            if (gameState.cards[idx]?.revealed) selectedCards.delete(idx);
        }
    }
    renderBoard();
    updateUI();
    updateSuspenseControls();
    renderChat();
    renderGameOver();
    tickTimer();
}

// ── Turn timer ──
// The server owns the clock (turn_started_at + turn_seconds). When it runs out, every client in the room asks
// timeout_turn to skip the turn; the server only acts if time is really up, so duplicate or early calls are harmless.
// ponytail: countdown uses the local clock against the server timestamp, so a skewed device shows it a few seconds off;
// the skip itself is still decided by the server.
let timeoutCallAt = 0;
function tickTimer() {
    const el = $('turn-timer'), g = gameState;
    if (!el) return;
    const on = g.turnSeconds > 0 && !g.gameOver && !!g.code;
    el.classList.toggle('hidden', !on);
    if (!on) return;
    if (!g.timerStarted) {
        const secs = g.turnSeconds;
        el.textContent = `⏱ ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
        el.classList.remove('low');
        return;
    }
    const left = Math.max(0, Math.ceil((g.turnStartedAt + g.turnSeconds * 1000 - Date.now()) / 1000));
    el.textContent = `⏱ ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    el.classList.toggle('low', left <= 10);
    if (left === 0 && Date.now() - timeoutCallAt > 2000) {
        timeoutCallAt = Date.now();
        const code = g.code;
        db.rpc('timeout_turn', { p_code: code }).then(({ data }) => { if (data && code === gameState.code) syncStateWithDB(data); });
    }
}
setInterval(tickTimer, 250);

// Same conditions handleCardClick enforces; used for the button `disabled` state and body.can-guess.
function canGuess() {
    const g = gameState;
    return g.myRole === 'guesser' && g.myTeam === g.turn && g.guessesRemaining > 0 && !g.gameOver && !g.eliminated.includes(g.myTeam);
}

function renderBoard() {
    const active = document.activeElement;
    const at = active !== boardEl && boardEl.contains(active) ? [...boardEl.children].indexOf(active) : -1;
    const guessing = canGuess();
    const isSuspense = gameState.gameMode === 'suspense';
    boardEl.style.setProperty('--cols', gameState.grid);
    boardEl.dataset.grid = gameState.grid;
    boardEl.replaceChildren(...gameState.cards.map((raw, i) => {
        const card = isEntry(raw) ? raw : {}; // a malformed card renders blank instead of throwing
        const word = typeof card.word === 'string' ? card.word : '';
        const team = [...TEAMS, 'neutral', 'black'].includes(card.team) ? card.team : '';
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'card';
        if (team) el.dataset.team = team; // honor-system: visible in devtools (see README, Step 8)
        el.textContent = word;
        // colour is spoken for revealed cards and for the spymaster, who already sees it
        el.setAttribute('aria-label', (card.revealed || gameState.myRole === 'spymaster') && team
            ? `${word || 'blank card'}, ${team === 'black' ? 'assassin' : team}` : (word || 'blank card'));
        if (card.revealed) el.classList.add('revealed');
        if (isSuspense && selectedCards.has(i)) {
            el.classList.add('selected');
            el.setAttribute('aria-pressed', 'true');
        } else if (isSuspense) {
            el.setAttribute('aria-pressed', 'false');
        }
        el.disabled = card.revealed || !guessing;
        el.addEventListener('click', () => handleCardClick(i));
        return el;
    }));
    if (at >= 0) { // keyboard user was on a card: keep them on the board, on the next card they can still use
        const kids = [...boardEl.children];
        (kids.slice(at).concat(kids.slice(0, at).reverse()).find((b) => !b.disabled) || boardEl).focus();
    }
}

function updateUI() {
    const { cardsLeft, eliminated, turn, guessesRemaining: n, gameOver, myTeam, myRole } = gameState;
    scoreboardEl.querySelectorAll('.score').forEach((el) => {
        const out = eliminated.includes(el.dataset.team);
        el.classList.toggle('eliminated', out);
        el.querySelector('.score-sr').textContent = `${teamLabel(el.dataset.team)} ${out ? 'eliminated' : 'cards left'} `;
        const num = el.querySelector('.score-n');
        num.textContent = out ? '☠' : (cardsLeft[el.dataset.team] ?? 0);
        num.setAttribute('aria-hidden', out ? 'true' : 'false');
    });

    const pill = $('turn-indicator');
    pill.dataset.team = turn;
    const pillText = gameOver ? 'Game over'
        : n === 0 ? `${teamLabel(turn)}'s turn — waiting for hint`
        : `${teamLabel(turn)}'s turn — ${n} ${n === 1 ? 'guess' : 'guesses'} left`;
    if (pill.textContent !== pillText) pill.textContent = pillText; // rewriting identical text would re-announce it

    const out = eliminated.includes(myTeam);
    playerInfoBadge.textContent = `${teamLabel(myTeam)} ${myRole.toUpperCase()}` + (out ? ' (eliminated)' : '');

    const myTurn = myTeam === turn && !gameOver;
    document.body.classList.toggle('can-guess', canGuess());
    endTurnBtn.disabled = !(myRole === 'guesser' && myTurn);
    hintWordInput.disabled = hintNumberInput.disabled = submitHintBtn.disabled = !(myRole === 'spymaster' && myTurn && n === 0);
    updateSuspenseControls();
    updateStartTimerControl();
}

// Chat entries come from the database. Render what is well-formed and never throw on the rest, so one bad entry
// cannot take down the board, the winner modal or the other messages.
const isTeam = (t) => TEAMS.includes(t);
const teamOrQ = (t) => (isTeam(t) ? teamLabel(t) : '?');
const isEntry = (m) => m !== null && typeof m === 'object';
const entryText = (m) => (typeof m.text === 'string' ? m.text : '');
const entryName = (m) => (typeof m.name === 'string' && m.name ? m.name : 'Anonymous');

// Only lines added since the last sync are announced (the log itself is aria-live="off" because it is rebuilt each sync).
let announcedLog = null;
function announceNewChat() {
    const log = gameState.chatLog, n = log.length;
    const from = announcedLog === null ? n : (n < announcedLog ? 0 : announcedLog); // shorter log = restarted game
    announcedLog = n;
    const lines = log.slice(from).filter(isEntry)
        .filter((m) => entryText(m).trim() && !(m.type === 'system' && / team's turn$/.test(m.text))) // the turn pill announces those
        .map((m) => (m.type === 'chat' ? `${entryName(m)}, ${isTeam(m.team) ? m.team : '?'}: ${m.text}`
            : m.type === 'hint' ? `${teamOrQ(m.team)} spymaster hint: ${m.text}` : m.text));
    if (lines.length) announce(lines.join('. '));
}

function chatLine(msg) {
    if (!isEntry(msg) || !entryText(msg).trim()) return null; // no text, no line (never a bare "Anonymous (?):")
    const el = document.createElement('div');
    el.className = 'hint-msg';
    if (msg.type === 'chat' || msg.type === 'hint') {
        if (isTeam(msg.team)) el.dataset.team = msg.team;
        const who = document.createElement('strong');
        if (msg.type === 'chat') {
            el.classList.add('chat');
            who.textContent = `${entryName(msg)} (${teamOrQ(msg.team)}):`;
        } else {
            who.textContent = `${teamOrQ(msg.team)} Spymaster:`;
        }
        el.append(who, ` ${entryText(msg)}`);
    } else {
        el.classList.add('system');
        el.textContent = entryText(msg);
    }
    return el;
}

function renderChat() {
    announceNewChat();
    chatLogEl.replaceChildren(...gameState.chatLog.map(chatLine).filter(Boolean));
    if (reconnectEl) chatLogEl.appendChild(reconnectEl);
    chatLogEl.scrollTop = chatLogEl.scrollHeight;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function getCurrentSpymaster(team) {
    if (!channel) return null;
    try {
        const state = channel.presenceState();
        if (!state) return null;
        const players = Object.values(state).flat();
        return players.find((p) => p && p.team === team && p.role === 'spymaster') || null;
    } catch (e) {
        return null;
    }
}

function updateRoleControls() {
    if (!roleToggleBtn) return;
    const myTeam = gameState.myTeam, myRole = gameState.myRole;
    if (!gameState.code) {
        roleToggleBtn.textContent = '🕵️ Become Spymaster';
        roleToggleBtn.disabled = false;
        roleToggleBtn.classList.remove('is-spymaster');
        if (teamSpymasterBanner) teamSpymasterBanner.replaceChildren();
        return;
    }

    const currentSpy = getCurrentSpymaster(myTeam);

    if (myRole === 'spymaster') {
        roleToggleBtn.textContent = '🎯 Switch to Guesser';
        roleToggleBtn.disabled = false;
        roleToggleBtn.classList.add('is-spymaster');
        roleToggleBtn.title = 'Step down as Spymaster and become a Guesser';
    } else {
        roleToggleBtn.classList.remove('is-spymaster');
        if (currentSpy && currentSpy.name !== gameState.myName) {
            roleToggleBtn.textContent = `🕵️ Spymaster: ${currentSpy.name || 'Anonymous'}`;
            roleToggleBtn.disabled = true;
            roleToggleBtn.title = `${currentSpy.name || 'Anonymous'} is already the Spymaster for ${teamLabel(myTeam)}`;
        } else {
            roleToggleBtn.textContent = '🕵️ Become Spymaster';
            roleToggleBtn.disabled = false;
            roleToggleBtn.title = `Claim Spymaster role for ${teamLabel(myTeam)}`;
        }
    }

    if (teamSpymasterBanner) {
        teamSpymasterBanner.dataset.team = myTeam;
        if (currentSpy) {
            const isMe = currentSpy.name === gameState.myName && myRole === 'spymaster';
            teamSpymasterBanner.innerHTML = `<span><strong>${teamLabel(myTeam)} Spymaster:</strong> ${escapeHtml(currentSpy.name || 'Anonymous')} ${isMe ? '(You)' : ''}</span>`;
        } else {
            teamSpymasterBanner.innerHTML = `<span><strong>${teamLabel(myTeam)} Spymaster:</strong> <em>Vacant (first to choose claims it)</em></span>`;
        }
    }
}

function isHost() {
    if (gameState.isHost) return true;
    if (gameState.hostName && gameState.hostName === gameState.myName) return true;
    try {
        if (sessionStorage.getItem('wg_is_host_' + gameState.code) === 'true') return true;
    } catch (e) {}
    return false;
}

function updateStartTimerControl() {
    if (!startTimerBtn) return;
    const g = gameState;
    const needed = g.turnSeconds > 0 && !g.timerStarted && !g.gameOver && !!g.code;
    startTimerBtn.classList.toggle('hidden', !needed);
    if (!needed) return;

    if (isHost()) {
        startTimerBtn.disabled = false;
        startTimerBtn.textContent = '▶ Start Timer';
        startTimerBtn.title = 'Start the turn timer for this round';
        startTimerBtn.classList.remove('btn-secondary');
        startTimerBtn.classList.add('btn-primary', 'btn-start-timer');
    } else {
        startTimerBtn.disabled = true;
        startTimerBtn.textContent = '⏳ Waiting for host to start';
        startTimerBtn.title = 'Waiting for the room creator to start the timer';
        startTimerBtn.classList.remove('btn-primary', 'btn-start-timer');
        startTimerBtn.classList.add('btn-secondary');
    }
}

async function handleStartTimerClick() {
    if (!isHost() || gameState.timerStarted || gameState.turnSeconds <= 0) return;
    startTimerBtn.disabled = true;
    startTimerBtn.textContent = 'Starting...';
    try {
        const { data, error } = await db.rpc('start_timer', { p_code: gameState.code });
        if (!error && data) {
            syncStateWithDB(data);
        } else {
            // Fallback for older database schemas that lack start_timer RPC:
            // Send a system message via send_chat so the start is recorded in chat_log on the server
            // and broadcast to all clients in the room via Realtime.
            const chatRes = await rpc('send_chat', {
                p_code: gameState.code,
                p_team: gameState.myTeam,
                p_name: 'System',
                p_text: 'Timer started!'
            });
            if (chatRes) {
                gameState.timerStarted = true;
                if (!gameState.turnStartedAt) gameState.turnStartedAt = Date.now();
                updateUI();
                tickTimer();
            } else {
                showToast('Could not start timer on server. Please check database permissions or schema.');
            }
        }
    } catch (e) {
        showToast('Could not start timer: ' + (e?.message || e));
    } finally {
        startTimerBtn.disabled = false;
        updateStartTimerControl();
    }
}

async function claimRole(newRole) {
    if (newRole === gameState.myRole) return false;
    if (newRole === 'spymaster') {
        const existing = getCurrentSpymaster(gameState.myTeam);
        if (existing && existing.name !== gameState.myName) {
            showToast(`Team ${teamLabel(gameState.myTeam)} already has a Spymaster (${existing.name || 'Anonymous'}).`);
            updateRoleControls();
            return false;
        }
        setRole('spymaster');
        showToast(`You are now Spymaster for ${teamLabel(gameState.myTeam)}!`, 'info');
        return true;
    } else {
        setRole('guesser');
        showToast(`You are now a Guesser for ${teamLabel(gameState.myTeam)}.`, 'info');
        return true;
    }
}

function setRole(role) {
    gameState.myRole = role;
    saveSession();
    document.body.classList.toggle('spymaster', role === 'spymaster');
    hintControls.classList.toggle('hidden', role !== 'spymaster');
    chatControls.classList.toggle('hidden', role === 'spymaster');
    if (channel) {
        channel.track({ name: gameState.myName, team: gameState.myTeam, role: gameState.myRole });
    }
    renderBoard();
    updateUI();
    updateRoleControls();
    announce(`Role changed to ${role}`);
}

function handleRoleToggleClick() {
    if (gameState.myRole === 'spymaster') {
        claimRole('guesser');
    } else {
        claimRole('spymaster');
    }
}

function renderRoster() {
    if (!channel) return;
    const players = Object.values(channel.presenceState()).flat();
    players.sort((a, b) => TEAMS.indexOf(a.team) - TEAMS.indexOf(b.team) || (a.name || '').localeCompare(b.name || ''));
    activePlayersList.replaceChildren(...players.map((p) => {
        const li = document.createElement('li');
        li.className = 'player-item';
        li.dataset.team = p.team;
        const name = document.createElement('strong');
        name.textContent = p.name || 'Anonymous';
        const info = document.createElement('span');
        info.textContent = ` (${p.team} ${p.role})`;
        li.append((p.role === 'spymaster' ? '🕵️' : '🎯') + ' ', name, info);
        return li;
    }));
    updateRoleControls();
}

function renderGameOver() {
    if (!gameState.gameOver) { closeGameOver(); return; }
    if (!gameOverModal.classList.contains('hidden')) return;
    gameOverOpener = document.activeElement;
    const w = (gameState.winner || '').trim();
    const winners = w ? w.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean) : [];
    if (winners.length > 1) {
        winnerText.textContent = `${winners.map((t) => teamLabel(t)).join(' & ')} TEAMS WIN! (TIE)`;
        winnerText.classList.add('tie');
        winnerText.removeAttribute('data-team');
    } else if (winners.length === 1) {
        winnerText.textContent = `${teamLabel(winners[0])} TEAM WINS!`;
        winnerText.dataset.team = winners[0];
        winnerText.classList.remove('tie');
    } else {
        winnerText.textContent = 'Game over';
        winnerText.removeAttribute('data-team');
        winnerText.classList.remove('tie');
    }
    winnerText.classList.add('win');
    gameOverModal.classList.remove('hidden');
    playAgainBtn.focus();
    if (winners.includes(gameState.myTeam) && window.confetti) confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
}

// ── Actions (all through rpc) ──
function handleCardClick(i) {
    const g = gameState;
    if (g.gameOver || g.myRole !== 'guesser' || g.myTeam !== g.turn || g.guessesRemaining <= 0
        || g.cards[i]?.revealed || g.eliminated.includes(g.myTeam)) return;

    if (g.gameMode === 'suspense') {
        if (selectedCards.has(i)) {
            selectedCards.delete(i);
        } else {
            if (selectedCards.size >= g.guessesRemaining) {
                showToast(`You can select at most ${g.guessesRemaining} words`);
                return;
            }
            selectedCards.add(i);
        }
        renderBoard();
        updateSuspenseControls();
        return;
    }

    rpc('reveal_card', { p_code: g.code, p_team: g.myTeam, p_index: i });
}

function updateSuspenseControls() {
    if (!suspenseControls) return;
    const g = gameState;
    const active = g.gameMode === 'suspense' && canGuess();
    suspenseControls.classList.toggle('hidden', !active);
    if (active) {
        const count = selectedCards.size;
        const max = g.guessesRemaining;
        suspenseCountEl.textContent = `Selected: ${count} / ${max} ${max === 1 ? 'word' : 'words'}`;
        submitGuessesBtn.disabled = count === 0;
        clearSelectionBtn.disabled = count === 0;
        submitGuessesBtn.textContent = count > 0 ? `Submit Guesses (${count})` : 'Submit Guesses';
    }
}

async function submitSuspenseGuesses() {
    const g = gameState;
    if (!canGuess() || g.gameMode !== 'suspense') return;
    if (selectedCards.size === 0) {
        showToast('Select at least 1 word to submit');
        return;
    }
    if (selectedCards.size > g.guessesRemaining) {
        showToast(`You can select at most ${g.guessesRemaining} words`);
        return;
    }
    submitGuessesBtn.disabled = true;
    submitGuessesBtn.textContent = 'Submitting...';
    try {
        const indices = Array.from(selectedCards);
        const res = await rpc('reveal_cards_batch', {
            p_code: g.code,
            p_team: g.myTeam,
            p_indices: indices
        });
        if (res) {
            selectedCards.clear();
        }
    } finally {
        updateSuspenseControls();
    }
}

async function submitHint() {
    const g = gameState;
    const word = hintWordInput.value.trim(), n = parseInt(hintNumberInput.value, 10);
    if (g.gameOver || g.myRole !== 'spymaster') return;
    if (g.myTeam !== g.turn) return showToast("It's not your team's turn");
    if (g.guessesRemaining > 0) return showToast('Your team still has guesses');
    if (!HINT_RE.test(word)) return showToast('Hint must be one word, letters only, max 15 characters');
    if (!(n >= 1 && n <= (g.cardsLeft[g.myTeam] ?? 0))) return showToast(`Number must be between 1 and ${g.cardsLeft[g.myTeam] ?? 0}`);
    if (g.cards.some((c) => isEntry(c) && typeof c.word === 'string' && c.word.toUpperCase() === word.toUpperCase())) return showToast('Hint cannot be a word on the board');
    if (await rpc('give_hint', { p_code: g.code, p_team: g.myTeam, p_word: word, p_n: n })) {
        hintWordInput.value = hintNumberInput.value = '';
        boardEl.focus(); // the inputs just became disabled; don't drop focus to <body>
    }
}

async function submitChat() {
    const g = gameState, text = chatTextInput.value.trim();
    if (g.myRole !== 'guesser' || !text || text.length > 200) return;
    if (await rpc('send_chat', { p_code: g.code, p_team: g.myTeam, p_name: g.myName, p_text: text })) chatTextInput.value = '';
}

function endTurn() {
    const g = gameState;
    if (g.myRole !== 'guesser' || g.myTeam !== g.turn || g.gameOver) return;
    selectedCards.clear();
    updateSuspenseControls();
    rpc('end_turn', { p_code: g.code, p_team: g.myTeam });
}

async function playAgain() {
    playAgainBtn.disabled = true;
    playAgainBtn.textContent = 'Restarting...';
    try {
        const startTeam = TEAMS[Math.floor(Math.random() * gameState.teams)];
        const res = await rpc('restart_game', {
            p_code: gameState.code,
            p_cards: generateBoard(gameState.teams),
            p_start_team: startTeam
        });
        if (!res) {
            await rpc('restart_game', { p_code: gameState.code, p_cards: generateBoard(gameState.teams) });
        }
    } finally {
        playAgainBtn.disabled = false;
        playAgainBtn.textContent = '🔄 Play Again';
    }
}

// ── Event listeners ──
createBtn.addEventListener('click', createGame);
joinBtn.addEventListener('click', async () => {
    joinBtn.disabled = true;
    joinBtn.textContent = 'Joining...';
    try {
        await joinGame({ code: joinIdInput.value, name: $('join-name').value.trim().slice(0, 20) || 'Anonymous',
                         team: $('join-team').value, role: 'guesser' });
    } finally {
        joinBtn.disabled = false;
        joinBtn.textContent = 'Join Game';
    }
});
if (themeToggleLobby) themeToggleLobby.addEventListener('click', toggleTheme);
if (themeToggleGame) themeToggleGame.addEventListener('click', toggleTheme);
if (roleToggleBtn) roleToggleBtn.addEventListener('click', handleRoleToggleClick);
if (startTimerBtn) startTimerBtn.addEventListener('click', handleStartTimerClick);
if (submitGuessesBtn) submitGuessesBtn.addEventListener('click', submitSuspenseGuesses);
if (clearSelectionBtn) clearSelectionBtn.addEventListener('click', () => {
    selectedCards.clear();
    renderBoard();
    updateSuspenseControls();
});
endTurnBtn.addEventListener('click', endTurn);
submitHintBtn.addEventListener('click', submitHint);
submitChatBtn.addEventListener('click', submitChat);
[[hintWordInput, submitHint], [hintNumberInput, submitHint], [chatTextInput, submitChat]].forEach(([el, fn]) =>
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') fn(); }));
playAgainBtn.addEventListener('click', playAgain);
returnLobbyBtn.addEventListener('click', leaveGame);
connectRetry.addEventListener('click', () => firstConnect(gameState.code));
connectLeave.addEventListener('click', leaveGame);
$('create-name').addEventListener('keydown', (e) => { if (e.key === 'Enter') createBtn.click(); });
[$('join-name'), joinIdInput].forEach((el) => el.addEventListener('keydown', (e) => { if (e.key === 'Enter') joinBtn.click(); }));

let leaveTimer = null;
leaveBtn.addEventListener('click', () => {
    if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null; leaveBtn.textContent = 'Leave'; leaveGame(); return; }
    leaveBtn.textContent = 'Leave? click again';
    announce('Press Leave again to confirm');
    leaveTimer = setTimeout(() => { leaveTimer = null; leaveBtn.textContent = 'Leave'; }, 3000);
});

// Rules modal
let rulesOpener = null;
function openRules(e) { rulesOpener = e.currentTarget; rulesModal.classList.remove('hidden'); closeRulesBtn.focus(); }
function closeRules() { rulesModal.classList.add('hidden'); if (rulesOpener) rulesOpener.focus(); }
$('rules-btn-lobby').addEventListener('click', openRules);
$('rules-btn-game').addEventListener('click', openRules);
closeRulesBtn.addEventListener('click', closeRules);
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!rulesModal.classList.contains('hidden')) closeRules(); else hideToast();
});

// Restore room after refresh
// A stored session only restores when no different room is named in the URL. (enterGame writes ?code= itself,
// so a plain refresh has the same code and still restores.)
const savedSession = loadSession();
const linkCode = (new URLSearchParams(location.search).get('code') || '').trim().toUpperCase();
const linkNamesOtherRoom = /^[A-Z0-9]{6}$/.test(linkCode) && savedSession && linkCode !== savedSession.code;
if (savedSession && !linkNamesOtherRoom) {
    joinGame(savedSession).then(() => {
        if (gameState.code) {
            const el = document.createElement('div');
            el.className = 'hint-msg system';
            el.textContent = 'Rejoined';
            chatLogEl.appendChild(el);
        }
    });
}
