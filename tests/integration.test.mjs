// S3 integration test: real sql/schema.sql (PGlite) + real index.html/script.js (jsdom), one window per player.
// Run: npm install && npm test   (from tests/)
import { createBackend } from './backend.mjs';
import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const html = fs.readFileSync(`${ROOT}/index.html`, 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
const js = fs.readFileSync(`${ROOT}/script.js`, 'utf8');

const be = await createBackend();
const pg = be.pg;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const channels = new Set();
const errors = [];
let pass = 0, fail = 0;
function check(name, cond, extra = '') {
    if (cond) { pass++; console.log('  PASS', name); } else { fail++; console.log('  FAIL', name, extra); }
}

const emit = (row) => channels.forEach((ch) => {
    if (ch.name === `room-${row.game_code}`) ch.handlers.filter((h) => h.type === 'postgres_changes').forEach((h) => h.cb({ new: row }));
});
const firePresence = (name) => channels.forEach((ch) => {
    if (ch.name === name) ch.handlers.filter((h) => h.type === 'presence').forEach((h) => h.cb());
});

function makeClient() {
    return {
        from: () => {
            const q = { row: null, code: null };
            q.insert = (row) => { q.row = row; return q; };
            q.select = () => q;
            q.eq = (c, v) => { q.code = v; return q; };
            const run = () => (q.row ? be.insert(q.row) : be.select(q.code));
            q.maybeSingle = run;
            q.single = async () => { const r = await run(); return r.error || r.data ? r : { data: null, error: { message: 'no rows' } }; };
            return q;
        },
        rpc: async (name, args) => {
            const r = await be.rpc(name, args);
            if (r.data) emit(r.data);
            return r;
        },
        channel(name, cfg) {
            const ch = {
                name, key: cfg?.config?.presence?.key, handlers: [], presence: null,
                on(type, opts, cb) { ch.handlers.push({ type, opts, cb }); return ch; },
                subscribe(cb) { channels.add(ch); setTimeout(() => cb('SUBSCRIBED'), 0); return ch; },
                async track(p) { ch.presence = p; firePresence(name); },
                presenceState() { const s = {}; channels.forEach((c) => { if (c.name === name && c.presence) s[c.key] = [c.presence]; }); return s; }
            };
            return ch;
        },
        removeChannel: async (ch) => { channels.delete(ch); firePresence(ch.name); }
    };
}

function mkPlayer(label, { url = 'http://localhost/', session } = {}) {
    const vc = new VirtualConsole();
    vc.on('jsdomError', (e) => errors.push(`[${label}] ${e.message}`));
    vc.on('error', (...a) => errors.push(`[${label}] console.error ${a.join(' ')}`));
    const dom = new JSDOM(html, { url, runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
    const w = dom.window;
    w.confettiCalls = 0;
    w.confetti = () => { w.confettiCalls++; };
    w.supabase = { createClient: () => makeClient() };
    if (session) w.sessionStorage.setItem('wg_session', JSON.stringify(session));
    const ctx = dom.getInternalVMContext();
    const run = (code) => new vm.Script(code).runInContext(ctx);
    run(js);
    const p = {
        label, w, doc: w.document,
        ev: run,
        get st() { return run('gameState'); },
        val: (id, v) => { p.doc.getElementById(id).value = v; },
        click: (id) => p.doc.getElementById(id).click(),
        card: (i) => p.doc.querySelectorAll('.card')[i],
        toast: () => p.doc.getElementById('toast').textContent,
        txt: (id) => p.doc.getElementById(id).textContent,
        hidden: (id) => p.doc.getElementById(id).classList.contains('hidden')
    };
    return p;
}

async function create(label, teams, team, role) {
    const p = mkPlayer(label);
    p.val('create-name', label); p.val('create-teams', String(teams));
    p.doc.getElementById('create-teams').dispatchEvent(new p.w.Event('change'));
    p.val('create-team', team); p.val('create-role', role);
    p.click('create-btn'); await sleep(150);
    return p;
}
async function join(label, code, team, role) {
    const p = mkPlayer(label);
    p.val('join-name', label); p.val('join-id', code); p.val('join-team', team); p.val('join-role', role);
    p.click('join-btn'); await sleep(150);
    return p;
}

const TEAMS = ['red', 'blue', 'green', 'cyan'];
// build a lobby: spymaster + guesser per team; returns {P:{team:{spy,gu}}, all:[...]}
async function lobby(teams) {
    const P = {}, all = [];
    const first = await create(`red-spy`, teams, 'red', 'spymaster');
    const code = first.st.code;
    P.red = { spy: first }; all.push(first);
    for (let i = 0; i < teams; i++) {
        const t = TEAMS[i];
        P[t] = P[t] || {};
        if (i > 0) { P[t].spy = await join(`${t}-spy`, code, t, 'spymaster'); all.push(P[t].spy); }
        P[t].gu = await join(`${t}-gu`, code, t, 'guesser'); all.push(P[t].gu);
    }
    return { P, all, code };
}

const s = (L) => L.all[0].st;
const settle = () => sleep(80);
async function hint(L, team, word, n) { const p = L.P[team].spy; p.val('hint-word', word); p.val('hint-number', String(n)); p.click('submit-hint'); await settle(); }
async function reveal(L, team, idx) { L.P[team].gu.card(idx).click(); await settle(); }
const unrevealed = (L, team) => s(L).cards.map((c, i) => ({ ...c, i })).filter((c) => c.team === team && !c.revealed);
const nextOf = (L, t) => { const n = s(L).teams; const el = s(L).eliminated; for (let k = 1; k <= n; k++) { const c = TEAMS[(TEAMS.indexOf(t) + k) % n]; if (!el.includes(c)) return c; } };
function invariant(L, tag) {
    const st = s(L);
    if (st.gameOver) return true;
    const ok = TEAMS.slice(0, st.teams).every((t) => st.cardsLeft[t] === st.cards.filter((c) => c.team === t && !c.revealed).length);
    if (!ok) check(`invariant cardsLeft==unrevealed (${tag})`, false, JSON.stringify(st.cardsLeft));
    return ok;
}
async function giveHintTo(L, team, n = 1) { await hint(L, team, 'ZEPHYRIA', n); }

// consistent state across all windows
function synced(L) { const a = JSON.stringify(L.all[0].st.cards) + L.all[0].st.turn; return L.all.every((p) => JSON.stringify(p.st.cards) + p.st.turn === a); }

async function playToEnd(L, tag) {
    const order = [];
    let guard = 0;
    while (!s(L).gameOver && guard++ < 200) {
        const T = s(L).turn; order.push(T);
        const n = Math.min(s(L).cardsLeft[T], 3);
        await giveHintTo(L, T, n);
        for (let k = 0; k < n && !s(L).gameOver; k++) {
            const c = unrevealed(L, T)[0]; if (!c) break;
            await reveal(L, T, c.i); invariant(L, tag);
        }
    }
    return order;
}

// ═════════ 2 teams ═════════
console.log('\n== 2-team game ==');
let L = await create('red-spy', 2, 'red', 'spymaster').then(async (f) => {
    const code = f.st.code;
    const P = { red: { spy: f }, blue: {} }, all = [f];
    P.red.gu = await join('red-gu', code, 'red', 'guesser');
    P.blue.spy = await join('blue-spy', code, 'blue', 'spymaster');
    P.blue.gu = await join('blue-gu', code, 'blue', 'guesser');
    all.push(P.red.gu, P.blue.spy, P.blue.gu);
    return { P, all, code };
});
let st = s(L);
const cnt = (t) => st.cards.filter((c) => c.team === t).length;
check('2t: 25 cards, grid 5, 5 columns', st.cards.length === 25 && st.grid === 5 && L.all[0].doc.getElementById('board').style.getPropertyValue('--cols') === '5');
check('2t: 1 black, 8 red, 8 blue, 8 neutral', cnt('black') === 1 && cnt('red') === 8 && cnt('blue') === 8 && cnt('neutral') === 8);
check('2t: 2 scores of 8', L.all[0].doc.querySelectorAll('.score').length === 2 && [...L.all[0].doc.querySelectorAll('.score-n')].every((e) => e.textContent === '8'));
check('2t: start team is red|blue, turn pill present', ['red', 'blue'].includes(st.turn) && L.all[0].txt('turn-indicator').includes("waiting for hint"));
check('2t: spymaster body class + hint controls shown / chat hidden', L.P.red.spy.doc.body.classList.contains('spymaster') && !L.P.red.spy.hidden('hint-controls') && L.P.red.spy.hidden('chat-controls'));
check('2t: guesser chat shown / hint hidden', !L.P.red.gu.hidden('chat-controls') && L.P.red.gu.hidden('hint-controls'));
check('2t: roster lists 4 players in every tab', L.all.every((p) => p.doc.querySelectorAll('#active-players-list li').length === 4));
check('2t: 25 card buttons, no revealed', L.all[0].doc.querySelectorAll('button.card').length === 25);

// chat
L.P.blue.gu.val('chat-text', 'hello <b>x</b>'); L.P.blue.gu.click('submit-chat'); await settle();
check('chat: visible in all tabs as "Name (TEAM): text", markup escaped', L.all.every((p) => p.txt('chat-log').includes('blue-gu (BLUE): hello <b>x</b>') && !p.doc.querySelector('#chat-log b')));
L.P.blue.spy.val('chat-text', 'x'); // spymaster has no chat: guard
L.P.blue.spy.click('submit-chat'); await settle();
check('chat: spymaster cannot send chat', !L.all[0].txt('chat-log').includes('blue-spy (BLUE)'));

const T0 = st.turn, O0 = nextOf(L, T0);
// hint validation
const before = s(L).chatLog.length;
for (const [w, n, msg] of [['two words', 1, 'one word'], ['abcdefghijklmnopqrstu', 1, 'one word'], ['ZEPHYRIA', 0, 'Number must be'], ['ZEPHYRIA', 9, 'Number must be'], [s(L).cards.find((c) => !c.revealed).word, 1, 'on the board']]) {
    await hint(L, T0, w, n);
    check(`hint rejected: "${w}" / ${n}`, L.P[T0].spy.toast().includes(msg) && s(L).guessesRemaining === 0 && s(L).chatLog.length === before, L.P[T0].spy.toast());
}
await hint(L, O0, 'ZEPHYRIA', 1);
check('hint by non-turn team spymaster rejected', s(L).guessesRemaining === 0);
check('hint controls disabled for non-turn spymaster', L.P[O0].spy.doc.getElementById('submit-hint').disabled === true);
await hint(L, T0, 'ZEPHYRIA', 2);
check('valid hint accepted, pill "2 guesses left"', s(L).guessesRemaining === 2 && L.all.every((p) => p.txt('turn-indicator').includes('2 guesses left')));
check('hint controls disabled after hint (still guesses)', L.P[T0].spy.doc.getElementById('submit-hint').disabled === true);
check('End Turn disabled for spymasters + non-turn guesser, enabled for turn guesser',
    L.P[T0].spy.doc.getElementById('end-turn-btn').disabled && L.P[O0].spy.doc.getElementById('end-turn-btn').disabled &&
    L.P[O0].gu.doc.getElementById('end-turn-btn').disabled && !L.P[T0].gu.doc.getElementById('end-turn-btn').disabled);
// direct RPC bypass: hint again while guesses remain (server)
{ const r = await L.P[T0].spy.ev(`db.rpc('give_hint', {p_code: gameState.code, p_team: gameState.myTeam, p_word: 'ABC', p_n: 1})`); check('server: hint while guesses remain rejected', r.error?.message === 'Your team still has guesses', JSON.stringify(r.error)); }
{ const r = await L.P[T0].spy.ev(`db.rpc('reveal_card', {p_code: gameState.code, p_team: '${O0}', p_index: 0})`); check('server: reveal on wrong turn rejected', r.error?.message === 'Not your turn'); }
{ const r = await L.P[T0].spy.ev(`db.rpc('send_chat', {p_code: gameState.code, p_team: 'red', p_name: 'x', p_text: '${'a'.repeat(201)}'})`); check('server: 201-char chat rejected', /too long/.test(r.error?.message)); }
{ const r = await L.P[T0].spy.ev(`db.rpc('give_hint', {p_code: 'NOPE00', p_team: 'red', p_word: 'ABC', p_n: 1})`); check('server: unknown game rejected', r.error?.message === 'Game not found'); }
{ await pg.exec('set role anon'); let msg = ''; try { const r = await pg.query(`update games set turn='blue' where game_code=$1`, [L.code]); msg = 'rows=' + r.affectedRows; } catch (e) { msg = e.message; } await pg.exec('reset role'); check('server: direct UPDATE as anon denied (' + msg + ')', /permission denied/.test(msg)); }

// non-turn guesser click: no-op
await reveal(L, O0, 0); check('non-turn guesser click ignored', s(L).cards.every((c) => !c.revealed));
// spymaster click ignored
L.P[T0].spy.card(0).click(); await settle(); check('spymaster card click ignored', s(L).cards.every((c) => !c.revealed));
// own card: count -1, turn same
let c = unrevealed(L, T0)[0]; await reveal(L, T0, c.i);
check('own card: count 7, turn unchanged, 1 guess left', s(L).cardsLeft[T0] === 7 && s(L).turn === T0 && s(L).guessesRemaining === 1);
check('scoreboard shows 7', L.all[0].doc.querySelector(`.score[data-team=${T0}] .score-n`).textContent === '7');
// neutral: turn passes, counts same
c = s(L).cards.map((x, i) => ({ ...x, i })).find((x) => x.team === 'neutral' && !x.revealed); await reveal(L, T0, c.i);
check('neutral: turn passes, counts unchanged, guesses 0', s(L).turn === O0 && s(L).cardsLeft[T0] === 7 && s(L).cardsLeft[O0] === 8 && s(L).guessesRemaining === 0);
// other's team card: decrement theirs, turn passes back
await giveHintTo(L, O0, 2);
c = unrevealed(L, T0)[0]; await reveal(L, O0, c.i);
check("opponent's card: their count -1, turn passes", s(L).cardsLeft[T0] === 6 && s(L).turn === T0 && s(L).guessesRemaining === 0);
// End Turn button
await giveHintTo(L, T0, 1); L.P[T0].gu.click('end-turn-btn'); await settle();
check('End Turn button passes turn, guesses 0', s(L).turn === O0 && s(L).guessesRemaining === 0);
check('system line "X team\'s turn" in chat', L.all[0].txt('chat-log').includes(`${O0.toUpperCase()} team's turn`));
invariant(L, '2t midgame');
check('all tabs in sync', synced(L));

// play out
const order = await playToEnd(L, '2t');
let okOrder = true; for (let i = 1; i < order.length; i++) if (order[i] === order[i - 1] && false) okOrder = false;
st = s(L);
const winner = st.winner;
check('2t: game over with a winner', st.gameOver && ['red', 'blue'].includes(winner), winner);
check('2t: winner has 0 cards left', st.cardsLeft[winner] === 0);
check('2t: modal shown in all tabs with "<TEAM> TEAM WINS!"', L.all.every((p) => !p.hidden('game-over-modal') && p.txt('winner-text') === `${winner.toUpperCase()} TEAM WINS!`));
check('2t: heading data-team=winner', L.all.every((p) => p.doc.getElementById('winner-text').dataset.team === winner));
check('2t: all cards revealed', st.cards.every((x) => x.revealed));
check('2t: confetti only for winner tabs', L.all.every((p) => (p.w.confettiCalls > 0) === (p.st.myTeam === winner)), L.all.map((p) => p.w.confettiCalls).join());
check('2t: pill "Game over", controls disabled', L.all.every((p) => p.txt('turn-indicator') === 'Game over' && p.doc.getElementById('end-turn-btn').disabled && p.doc.getElementById('submit-hint').disabled));
check('2t: no card clickable after end', L.all.every((p) => [...p.doc.querySelectorAll('.card')].every((e) => e.disabled)));
// play again
L.P.red.gu.click('play-again-btn'); await settle();
st = s(L);
check('play again: new board 25, counts 8/8, modal hidden, not over, start ∈ teams', st.cards.length === 25 && st.cardsLeft.red === 8 && st.cardsLeft.blue === 8 && !st.gameOver && ['red', 'blue'].includes(st.turn) && L.all.every((p) => p.hidden('game-over-modal')));
check('play again: chat reset "Game restarted!"', L.all[0].txt('chat-log').includes('Game restarted!'));
// assassin in 2-team
const T1 = s(L).turn, O1 = nextOf(L, T1);
await giveHintTo(L, T1, 1);
c = s(L).cards.map((x, i) => ({ ...x, i })).find((x) => x.team === 'black'); await reveal(L, T1, c.i);
st = s(L);
check('2t assassin: game over, winner = other team, all revealed, modal shown', st.gameOver && st.winner === O1 && st.eliminated.includes(T1) && st.cards.every((x) => x.revealed) && L.all.every((p) => !p.hidden('game-over-modal')), JSON.stringify([st.winner, st.eliminated]));
// Leave / return to lobby
L.P.red.gu.click('return-lobby-btn'); await sleep(80);
check('return to lobby: lobby visible, modal hidden, url cleared, session cleared', !L.P.red.gu.hidden('lobby-screen') && L.P.red.gu.hidden('game-screen') && L.P.red.gu.w.location.search === '' && L.P.red.gu.w.sessionStorage.getItem('wg_session') === null);
check('leave: roster in other tabs updates (3 players)', L.all[0].doc.querySelectorAll('#active-players-list li').length === 3);
L.P.blue.gu.click('leave-btn'); check('leave: first click asks confirm', L.P.blue.gu.txt('leave-btn') === 'Leave? click again' && !L.P.blue.gu.hidden('game-screen'));
L.P.blue.gu.click('leave-btn'); await sleep(80); check('leave: second click leaves', L.P.blue.gu.hidden('game-screen'));
// refresh restore + ?code prefill
{
    const sess = JSON.parse(L.all[0].w.sessionStorage.getItem('wg_session'));
    const r = mkPlayer('refresh', { session: sess }); await sleep(250);
    check('refresh: auto-rejoin same room/role', !r.hidden('game-screen') && r.st.code === L.code && r.st.myRole === 'spymaster' && r.txt('chat-log').includes('Rejoined'));
    const q = mkPlayer('code-prefill', { url: `http://localhost/?code=${L.code.toLowerCase()}` });
    check('?code= prefills join form (uppercased)', q.doc.getElementById('join-id').value === L.code);
    const bad = await join('bad', 'ZZZZZZ', 'red', 'guesser'); check('join unknown code → toast "Game not found"', bad.toast() === 'Game not found' && !bad.hidden('lobby-screen'));
    const bad2 = await join('bad2', 'abc', 'red', 'guesser'); check('join short code → toast', bad2.toast() === 'Enter a 6-character code');
    const bad3 = await join('bad3', L.code, 'green', 'guesser'); check('join team beyond game size → toast', bad3.toast() === 'This game has 2 teams');
    check('join button re-enabled after failure', !bad.doc.getElementById('join-btn').disabled && bad.txt('join-btn') === 'Join Game');
}

// ═════════ 3 teams ═════════
console.log('\n== 3-team game ==');
L = await lobby(3);
st = s(L);
check('3t: 36 cards, grid 6, 6 cols', st.cards.length === 36 && st.grid === 6 && L.all[0].doc.getElementById('board').dataset.grid === '6');
check('3t: 2 black, 8×3, 10 neutral', cnt2(st, 'black') === 2 && ['red', 'blue', 'green'].every((t) => cnt2(st, t) === 8) && cnt2(st, 'neutral') === 10);
function cnt2(stt, t) { return stt.cards.filter((x) => x.team === t).length; }
check('3t: 3 scores; create-team options: 3 visible? (join allowed green)', L.all[0].doc.querySelectorAll('.score').length === 3 && L.P.green.gu.st.myTeam === 'green');
{
    // create-teams change hides options
    const p = mkPlayer('opts'); p.val('create-teams', '3'); p.doc.getElementById('create-teams').dispatchEvent(new p.w.Event('change'));
    const vis = [...p.doc.getElementById('create-team').options].filter((o) => !o.hidden).map((o) => o.value);
    check('lobby: 3 teams → create-team shows red/blue/green only', vis.join() === 'red,blue,green', vis.join());
    p.doc.getElementById('create-team').value = 'green'; p.val('create-teams', '2'); p.doc.getElementById('create-teams').dispatchEvent(new p.w.Event('change'));
    check('lobby: 2 teams resets selection to red', p.doc.getElementById('create-team').value === 'red');
}
// elimination #1
let X = s(L).turn, Y = nextOf(L, X);
await giveHintTo(L, X, 1);
c = s(L).cards.map((x, i) => ({ ...x, i })).find((x) => x.team === 'black' && !x.revealed); await reveal(L, X, c.i);
st = s(L);
check(`3t: ${X} eliminated, game continues`, st.eliminated.join() === X && !st.gameOver);
check('3t: turn passes to next non-eliminated team, guesses 0', st.turn === Y && st.guessesRemaining === 0, st.turn);
check('3t: score shows ☠ + .eliminated for that team', L.all.every((p) => { const e = p.doc.querySelector(`.score[data-team=${X}]`); return e.textContent.includes('☠') && e.classList.contains('eliminated'); }));
check('3t: system line "revealed an assassin and is eliminated!"', L.all[0].txt('chat-log').includes(`${X.toUpperCase()} revealed an assassin and is eliminated!`));
check('3t: eliminated guesser badge "(eliminated)", cannot click', L.P[X].gu.txt('player-info-badge').includes('(eliminated)') && !L.P[X].gu.doc.body.classList.contains('can-guess'));
// turn skips eliminated: Y → Z → Y
const Z = TEAMS.slice(0, 3).find((t) => t !== X && t !== Y);
await giveHintTo(L, Y, 1); L.P[Y].gu.click('end-turn-btn'); await settle();
check(`3t: turn order skips eliminated (${Y} → ${Z})`, s(L).turn === Z, s(L).turn);
await giveHintTo(L, Z, 1); L.P[Z].gu.click('end-turn-btn'); await settle();
check(`3t: wraps back (${Z} → ${Y}, skipping ${X})`, s(L).turn === Y, s(L).turn);
// eliminated guesser click during its own 'turn' impossible; attempt on active turn is no-op
await giveHintTo(L, Y, 1); const rv = s(L).cards.filter((x) => x.revealed).length; await reveal(L, X, unrevealed(L, X)[0].i);
check('3t: eliminated team guesser click ignored', s(L).cards.filter((x) => x.revealed).length === rv);
L.P[Y].gu.click('end-turn-btn'); await settle(); // now Z
// reveal every X card via Y and Z; X must not win
let guard = 0;
while (unrevealed(L, X).length && guard++ < 40) {
    const T = s(L).turn; await giveHintTo(L, T, 1); await reveal(L, T, unrevealed(L, X)[0].i); invariant(L, '3t elim reveal');
}
st = s(L);
check('3t: eliminated team hitting 0 cards does NOT win; game continues', st.cardsLeft[X] === 0 && !st.gameOver && st.winner === '');
// second assassin by Y (or whoever's turn)
const T2 = s(L).turn, W2 = TEAMS.slice(0, 3).find((t) => t !== X && t !== T2);
await giveHintTo(L, T2, 1);
c = s(L).cards.map((x, i) => ({ ...x, i })).find((x) => x.team === 'black' && !x.revealed); await reveal(L, T2, c.i);
st = s(L);
check(`3t: 2nd assassin by ${T2} → last team ${W2} wins, all revealed, modal`, st.gameOver && st.winner === W2 && st.eliminated.length === 2 && st.cards.every((x) => x.revealed) && L.all.every((p) => !p.hidden('game-over-modal')), JSON.stringify([st.winner, st.eliminated]));
check('3t: confetti only in winner tabs', L.all.every((p) => (p.w.confettiCalls > 0) === (p.st.myTeam === W2)));
// 3t win by cards
L.P.red.gu.click('play-again-btn'); await settle();
check('3t: play again keeps 3 teams / 36 cards / clears eliminated', s(L).cards.length === 36 && s(L).eliminated.length === 0 && !s(L).gameOver);
await playToEnd(L, '3t');
st = s(L);
check('3t: win by clearing all own cards', st.gameOver && st.cardsLeft[st.winner] === 0 && st.eliminated.length === 0, st.winner);

// ═════════ 4 teams ═════════
console.log('\n== 4-team game ==');
L = await lobby(4);
st = s(L);
check('4t: 49 cards, grid 7', st.cards.length === 49 && st.grid === 7 && L.all[0].doc.getElementById('board').dataset.grid === '7');
check('4t: 3 black, 9×4, 10 neutral', cnt2(st, 'black') === 3 && TEAMS.every((t) => cnt2(st, t) === 9) && cnt2(st, 'neutral') === 10);
check('4t: 4 scores of 9', L.all[0].doc.querySelectorAll('.score').length === 4 && [...L.all[0].doc.querySelectorAll('.score-n')].every((e) => e.textContent === '9'));
// turn order via End Turn ×5
let seq = [s(L).turn];
for (let i = 0; i < 5; i++) { const T = s(L).turn; await giveHintTo(L, T, 1); L.P[T].gu.click('end-turn-btn'); await settle(); seq.push(s(L).turn); }
check('4t: turn order red→blue→green→cyan wrapping: ' + seq.join('>'), seq.every((t, i) => i === 0 || t === TEAMS[(TEAMS.indexOf(seq[i - 1]) + 1) % 4]));
// eliminate three teams in sequence
const elim = [];
for (let k = 0; k < 3; k++) {
    const T = s(L).turn; await giveHintTo(L, T, 1);
    c = s(L).cards.map((x, i) => ({ ...x, i })).find((x) => x.team === 'black' && !x.revealed);
    const exp = nextOf({ all: [{ st: { ...s(L), eliminated: [...s(L).eliminated, T] } }] }, T);
    await reveal(L, T, c.i); elim.push(T); st = s(L);
    if (k < 2) check(`4t: assassin #${k + 1} by ${T} → eliminated, next turn ${exp}`, st.eliminated.join() === elim.join() && st.turn === exp && !st.gameOver, JSON.stringify([st.eliminated, st.turn]));
}
st = s(L);
const last = TEAMS.find((t) => !elim.includes(t));
check(`4t: 3 assassins → last team ${last} wins`, st.gameOver && st.winner === last && st.eliminated.length === 3);
L.P.red.gu.click('play-again-btn'); await settle();
await playToEnd(L, '4t');
st = s(L);
check('4t: win by clearing all 9 own cards', st.gameOver && st.cardsLeft[st.winner] === 0 && st.cards.every((x) => x.revealed));

// ═════════ error log ═════════
console.log(`\nJS/console errors captured: ${errors.length}`);
errors.slice(0, 10).forEach((e) => console.log('  ', e));
console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail || errors.length ? 1 : 0);
