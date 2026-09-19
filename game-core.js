// Pure game constants and board generation. No DOM, no Supabase: loaded by index.html before script.js, and by test.html.
const TEAMS = ['red', 'blue', 'green', 'cyan'];
const MODES = { 2: { grid: 5, perTeam: 8 }, 3: { grid: 6, perTeam: 8 }, 4: { grid: 7, perTeam: 9 } };
// assassins = teams − 1; neutral = grid² − assassins − teams×perTeam  → 8 / 10 / 10
const HINT_RE = /^[A-Za-z][A-Za-z'-]{0,19}$/;

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// `pool` defaults to the global `words` list defined in script.js; tests pass their own.
function generateBoard(teams, pool = words) {
    const { grid, perTeam } = MODES[teams];
    const n = grid * grid, black = teams - 1;
    const picked = shuffle([...pool]).slice(0, n);
    const labels = [];
    for (let i = 0; i < black; i++) labels.push('black');
    TEAMS.slice(0, teams).forEach((t) => { for (let i = 0; i < perTeam; i++) labels.push(t); });
    while (labels.length < n) labels.push('neutral');
    shuffle(labels);
    return picked.map((word, i) => ({ word, team: labels[i], revealed: false }));
}
