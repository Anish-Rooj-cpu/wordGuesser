// Pure game constants and board generation. No DOM, no Supabase: loaded by index.html before script.js, and by test.html.
const TEAMS = ['red', 'blue', 'green', 'cyan'];
const MODES = {
    2: { grid: 5, perTeam: 9, neutral: 6, black: 1 },
    3: { grid: 6, perTeam: 10, neutral: 4, black: 2 },
    4: { grid: 7, perTeam: 10, neutral: 6, black: 3 }
};
const HINT_RE = /^[A-Za-z][A-Za-z'-]{0,14}$/;

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// Extensive curated thematic clusters of 2-3 loosely related words from the 928-word dictionary pool for Easy Mode.
const EASY_CLUSTERS = [
    // Animals & Nature
    ['BIRD', 'FISH', 'INSECT'], ['RIVER', 'LAKE', 'WATER'], ['TREE', 'GARDEN', 'PLANT'],
    ['RAIN', 'STORM', 'WIND'], ['BEAR', 'ANIMAL', 'HORSE'], ['EARTH', 'SOIL', 'ROCK'],
    ['FIRE', 'HEAT', 'SMOKE'], ['WOOD', 'GRASS', 'FLOWER'], ['BEACH', 'COAST', 'SAND'],
    ['ISLAND', 'MOUNTAIN', 'PEAK'], ['SNOW', 'WINTER', 'WEATHER'], ['CLOUD', 'RAIN', 'STORM'],

    // Food & Dining
    ['FOOD', 'MEAT', 'SOUP'], ['BREAD', 'COOKIE', 'CHOCOLATE'], ['POTATO', 'SALAD', 'DINNER'],
    ['COFFEE', 'MILK', 'JUICE'], ['BEER', 'WINE', 'ALCOHOL'], ['APPLE', 'FRUIT', 'ORANGE'],
    ['KITCHEN', 'OVEN', 'RECIPE'], ['MEAL', 'BREAKFAST', 'DINNER'], ['SUGAR', 'HONEY', 'SALT'],
    ['PIZZA', 'SANDWICH', 'LUNCH'], ['CAKE', 'CANDY', 'CHOCOLATE'], ['RICE', 'POTATO', 'SOUP'],
    ['CHICKEN', 'STEAK', 'MEAT'], ['DISH', 'PLATE', 'BOWL'], ['GROCERY', 'MARKET', 'STORE'],

    // Technology & Digital
    ['COMPUTER', 'SOFTWARE', 'PROGRAM'], ['PHONE', 'MESSAGE', 'INTERNET'], ['DISK', 'DATABASE', 'DATA'],
    ['CAMERA', 'VIDEO', 'PHOTO'], ['SCREEN', 'MONITOR', 'BUTTON'], ['DEVICE', 'MACHINE', 'ENGINE'],
    ['RADIO', 'TELEPHONE', 'CHANNEL'], ['CODE', 'FILE', 'SYSTEM'], ['NETWORK', 'LINK', 'SITE'],

    // Travel & Transport
    ['AIRPORT', 'FLIGHT', 'PLANE'], ['ROAD', 'HIGHWAY', 'STREET'], ['TRAIN', 'TRACK', 'STATION'],
    ['BOAT', 'SHIP', 'SAIL'], ['DRIVER', 'VEHICLE', 'SPEED'], ['TICKET', 'TOUR', 'TRIP'],
    ['HOTEL', 'RESORT', 'VACATION'], ['BICYCLE', 'BIKE', 'WHEEL'], ['TRUCK', 'PARKING', 'GARAGE'],
    ['PASSENGER', 'ARRIVAL', 'DEPARTURE'], ['BRIDGE', 'RIVER', 'PATH'],

    // Health & Medicine
    ['DOCTOR', 'HOSPITAL', 'MEDICINE'], ['DISEASE', 'VIRUS', 'CANCER'], ['HEALTH', 'CARE', 'BODY'],
    ['BLOOD', 'HEART', 'BREATH'], ['SURGERY', 'PATIENT', 'INJURY'], ['CHEST', 'KNEE', 'THROAT'],
    ['TONGUE', 'TOOTH', 'CHEEK'], ['NURSE', 'PATIENT', 'DOCTOR'], ['PAIN', 'HARM', 'DAMAGE'],
    ['MUSCLE', 'BONE', 'JOINT'], ['BRAIN', 'HEAD', 'MIND'],

    // Education & Books
    ['STUDENT', 'TEACHER', 'CLASSROOM'], ['EXAM', 'MATH', 'PHYSICS'], ['COLLEGE', 'LIBRARY', 'SCHOOL'],
    ['BOOK', 'PAGE', 'CHAPTER'], ['WRITING', 'ARTICLE', 'ESSAY'], ['HISTORY', 'STORY', 'POEM'],
    ['CHEMISTRY', 'SCIENCE', 'THEORY'], ['LESSON', 'HOMEWORK', 'COURSE'], ['NOVEL', 'POETRY', 'POET'],
    ['RESEARCH', 'STUDY', 'ANALYSIS'], ['PROFESSOR', 'TEACHER', 'STUDENT'],

    // Home & Furniture
    ['HOUSE', 'HOME', 'BUILDING'], ['BEDROOM', 'BATHROOM', 'ROOM'], ['DOOR', 'WINDOW', 'WALL'],
    ['CHAIR', 'TABLE', 'DESK'], ['DRAWER', 'CABINET', 'CLOSET'], ['ROOF', 'FLOOR', 'GATE'],
    ['CLOCK', 'MIRROR', 'CANDLE'], ['BELL', 'CLOCK', 'ALARM'], ['CARPET', 'ROOM', 'FLOOR'],
    ['SHOWER', 'BATH', 'TOWEL'], ['APARTMENT', 'HOUSING', 'PROPERTY'], ['RENT', 'MORTGAGE', 'ESTATE'],

    // Clothing & Fashion
    ['SHIRT', 'DRESS', 'SUIT'], ['SHOE', 'BOOT', 'SOCK'], ['COAT', 'GLOVE', 'JACKET'],
    ['CLOTHES', 'BELT', 'SKIRT'], ['LEATHER', 'COLLAR', 'RING'],

    // Sports & Games
    ['BASEBALL', 'FOOTBALL', 'TENNIS'], ['PLAYER', 'COACH', 'TEAM'], ['GAME', 'SPORT', 'MATCH'],
    ['WINNER', 'PRIZE', 'CHAMPION'], ['BALL', 'BASKET', 'BASEBALL'], ['GOLF', 'RACE', 'CONTEST'],
    ['PITCH', 'SCORE', 'LEAGUE'], ['SWIMMING', 'POOL', 'WATER'],

    // Music & Arts
    ['MUSIC', 'SONG', 'GUITAR'], ['PIANO', 'BAND', 'SINGER'], ['PAINTING', 'DRAWING', 'PHOTO'],
    ['MOVIE', 'FILM', 'ACTOR'], ['DRAMA', 'THEME', 'POETRY'], ['CONCERT', 'TUNE', 'RECORDING'],

    // People & Family
    ['MOTHER', 'FATHER', 'CHILD'], ['BROTHER', 'SISTER', 'COUSIN'], ['KING', 'QUEEN', 'PRESIDENT'],
    ['WOMAN', 'GIRL', 'DAUGHTER'], ['LEADER', 'DIRECTOR', 'BOSS'], ['POLICE', 'OFFICER', 'GUARD'],
    ['LAWYER', 'JUDGE', 'JURY'], ['GUEST', 'MEMBER', 'PARTNER'], ['UNCLE', 'HUSBAND', 'BOYFRIEND'],
    ['ARMY', 'BATTLE', 'FIGHT'], ['WITNESS', 'EVIDENCE', 'PROOF'], ['CLIENT', 'CUSTOMER', 'BUYER'],
    ['PARENT', 'BABY', 'CHILDHOOD'], ['FRIEND', 'BUDDY', 'MATE'],

    // Business & Finance
    ['MONEY', 'CASH', 'PRICE'], ['BANK', 'DEBT', 'LOAN'], ['MARKET', 'TRADE', 'SALE'],
    ['COMPANY', 'INDUSTRY', 'BUSINESS'], ['INCOME', 'PROFIT', 'REVENUE'], ['CONTRACT', 'AGREEMENT', 'SIGNATURE'],
    ['GOLD', 'SILVER', 'DIAMOND'], ['SALARY', 'BONUS', 'PAYMENT'], ['BUDGET', 'FINANCE', 'ACCOUNT'],
    ['STOCK', 'SHARE', 'TRADE'], ['ECONOMY', 'MARKET', 'WEALTH'],

    // Time & Calendar
    ['YEAR', 'MONTH', 'WEEK'], ['NIGHT', 'MORNING', 'AFTERNOON'], ['SUMMER', 'WINTER', 'WEEKEND'],
    ['MINUTE', 'HOUR', 'TIME'], ['CALENDAR', 'SCHEDULE', 'ROUTINE'], ['MIDNIGHT', 'EVENING', 'NIGHT'],

    // Feelings & Psychology
    ['LOVE', 'PASSION', 'DESIRE'], ['FEAR', 'ANXIETY', 'PANIC'], ['MIND', 'MEMORY', 'THOUGHT'],
    ['ANGER', 'STRESS', 'TENSION'], ['COMFORT', 'RELIEF', 'EASE'], ['COURAGE', 'PRIDE', 'SPIRIT'],
    ['HOPE', 'DREAM', 'GOAL'],

    // Geography & Places
    ['CITY', 'TOWN', 'VILLAGE'], ['COUNTRY', 'NATION', 'REPUBLIC'], ['DISTRICT', 'REGION', 'AREA'],
    ['PARK', 'GARDEN', 'LANDSCAPE'], ['STREET', 'CORNER', 'HIGHWAY'],

    // News & Media
    ['NEWSPAPER', 'MAGAZINE', 'ARTICLE'], ['NEWS', 'EDITOR', 'WRITER'], ['INTERVIEW', 'SPEECH', 'STATEMENT'],

    // Construction, Materials & Tools
    ['BRICK', 'ROOF', 'STRUCTURE'], ['SCREW', 'NAIL', 'TOOL'], ['CHAIN', 'ROPE', 'STRING'],
    ['METAL', 'IRON', 'ROCK'], ['PLASTIC', 'METAL', 'MATERIAL'], ['PACKAGE', 'PACK', 'DELIVERY'],

    // Events & Celebrations
    ['BIRTHDAY', 'HOLIDAY', 'WEDDING'], ['PARTY', 'GUEST', 'FUNERAL'], ['AWARD', 'REWARD', 'PRIZE'],
    ['BIRTH', 'YOUTH', 'DEATH']
];

// `pool` defaults to the global `words` list defined in script.js; tests pass their own.
function generateBoard(teams, pool = words, mode = 'normal') {
    const cfg = MODES[teams] || MODES[2];
    const { grid, perTeam, neutral, black } = cfg;
    const n = grid * grid;

    if (mode === 'easy') {
        const poolSet = new Set(pool);
        const validClusters = EASY_CLUSTERS.map((c) => c.filter((w) => poolSet.has(w))).filter((c) => c.length >= 2);
        const shuffledClusters = shuffle([...validClusters]);
        const usedWords = new Set();
        const cards = [];

        // Assign semantic clusters to each team until they reach perTeam cards
        const activeTeams = TEAMS.slice(0, teams);
        for (const t of activeTeams) {
            let teamCount = 0;
            while (teamCount < perTeam) {
                const cluster = shuffledClusters.pop();
                if (!cluster) break;
                for (const w of cluster) {
                    if (teamCount < perTeam && !usedWords.has(w)) {
                        usedWords.add(w);
                        cards.push({ word: w, team: t, revealed: false });
                        teamCount++;
                    }
                }
            }
            // Fallback if clusters exhausted: fill remaining team words from random pool
            if (teamCount < perTeam) {
                const remaining = shuffle(pool.filter((w) => !usedWords.has(w)));
                while (teamCount < perTeam && remaining.length > 0) {
                    const w = remaining.pop();
                    usedWords.add(w);
                    cards.push({ word: w, team: t, revealed: false });
                    teamCount++;
                }
            }
        }

        // Add assassins (black)
        const unassigned = shuffle(pool.filter((w) => !usedWords.has(w)));
        for (let i = 0; i < black && unassigned.length > 0; i++) {
            const w = unassigned.pop();
            usedWords.add(w);
            cards.push({ word: w, team: 'black', revealed: false });
        }

        // Add neutrals
        while (cards.length < n && unassigned.length > 0) {
            const w = unassigned.pop();
            usedWords.add(w);
            cards.push({ word: w, team: 'neutral', revealed: false });
        }

        // Shuffle cards so clusters are scattered across the board grid
        return shuffle(cards);
    }

    // Normal / Suspense Mode
    const picked = shuffle([...pool]).slice(0, n);
    const labels = [];
    for (let i = 0; i < black; i++) labels.push('black');
    TEAMS.slice(0, teams).forEach((t) => { for (let i = 0; i < perTeam; i++) labels.push(t); });
    while (labels.length < n) labels.push('neutral');
    shuffle(labels);
    return picked.map((word, i) => ({ word, team: labels[i], revealed: false }));
}

// Deterministic visual layout scramble (Option B):
// Spymaster and Guesser of the same team share the exact same visual card scramble.
// Different teams get different scrambles.
// Zero extra strain on database: computed purely on client side.
function getVisualScramble(roomCode, team, count) {
    if (!count) return [];
    const str = `${roomCode || 'ROOM'}_${team || 'all'}_${count}`;
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    const rng = () => {
        h = (h ^ (h << 13)) >>> 0;
        h = (h ^ (h >>> 17)) >>> 0;
        h = (h ^ (h << 5)) >>> 0;
        return (h >>> 0) / 4294967296;
    };
    const order = Array.from({ length: count }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
    }
    return order;
}

