// S3 integration test: real sql/schema.sql (PGlite) + real index.html/script.js (jsdom), one window per player.
// Run: npm install && npm test   (from tests/)
import { createBackend } from './backend.mjs';
import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const html = fs.readFileSync(`${ROOT}/index.html`, 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
const js = fs.readFileSync(`${ROOT}/game-core.js`, 'utf8') + '\n' + fs.readFileSync(`${ROOT}/script.js`, 'utf8'); // same order as index.html

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

const net = { offline: new Set(), failSubscribe: new Set(), subscribes: {}, hook: null, delay: null, failRpc: null }; // per-owner outage switch + subscribe attempt counter
let SCALE = 1; // >1 shrinks every page timer (backoff tests)
const offlineErr = { data: null, error: { message: 'offline' } };

function makeClient(owner) {
    return {
        from: () => {
            const q = { row: null, code: null };
            q.insert = (row) => { q.row = row; return q; };
            q.select = () => q;
            q.eq = (c, v) => { q.code = v; return q; };
            const run = async () => (net.offline.has(owner) ? offlineErr : q.row ? be.insert(q.row) : be.select(q.code));
            q.maybeSingle = run;
            q.single = async () => { const r = await run(); return r.error || r.data ? r : { data: null, error: { message: 'no rows' } }; };
            return q;
        },
        rpc: async (name, args) => {
            if (net.offline.has(owner)) return offlineErr;
            if (net.failRpc && net.failRpc.name === name) {
                return { data: null, error: { message: `function ${name} does not exist`, code: 'PGRST202' } };
            }
            const r = await be.rpc(name, args);
            const h = net.hook && net.hook.owner === owner && net.hook.name === name && r.data ? net.hook : null;
            if (h) { // connection dies exactly as this RPC resolves: server applied it, this client's channel is gone for the echo
                net.hook = null; net.offline.add(owner); drop({ label: owner });
                emit(r.data); // everyone else still hears it
                return h.loseResponse ? offlineErr : r;
            }
            if (r.data) emit(r.data);
            if (net.delay && net.delay.owner === owner && net.delay.name === name) { const ms = net.delay.ms; net.delay = null; await sleep(ms); } // slow HTTP response
            return r;
        },
        channel(name, cfg) {
            const ch = {
                name, owner, key: cfg?.config?.presence?.key, handlers: [], presence: null, cb: null,
                on(type, opts, cb) { ch.handlers.push({ type, opts, cb }); return ch; },
                subscribe(cb) {
                    ch.cb = cb;
                    net.subscribes[owner] = (net.subscribes[owner] || 0) + 1;
                    if (net.offline.has(owner) || net.failSubscribe.has(owner)) { setTimeout(() => cb('TIMED_OUT'), 0); return ch; }
                    channels.add(ch); setTimeout(() => cb('SUBSCRIBED'), 0); return ch;
                },
                async track(p) { ch.presence = p; firePresence(name); },
                presenceState() { const s = {}; channels.forEach((c) => { if (c.name === name && c.presence) s[c.key] = [c.presence]; }); return s; }
            };
            return ch;
        },
        removeChannel: async (ch) => { channels.delete(ch); firePresence(ch.name); setTimeout(() => ch.cb && ch.cb('CLOSED'), 0); } // like supabase-js
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
    if (SCALE !== 1) w.setTimeout = (f, ms, ...a) => setTimeout(f, ms / SCALE, ...a);
    w.supabase = { createClient: () => makeClient(label) };
    if (session) w.sessionStorage.setItem('wg_session', JSON.stringify(session));
    const ctx = dom.getInternalVMContext();
    const run = (code) => new vm.Script(code).runInContext(ctx);
    run(js);
    const p = {
        label, w, doc: w.document,
        ev: run,
        get st() { return run('gameState'); },
        val: (id, v) => { const el = p.doc.getElementById(id); if (el) el.value = v; },
        click: (id) => p.doc.getElementById(id).click(),
        card: (i) => p.doc.querySelectorAll('.card')[i],
        toast: () => p.doc.getElementById('toast').textContent,
        txt: (id) => p.doc.getElementById(id).textContent,
        hidden: (id) => p.doc.getElementById(id).classList.contains('hidden')
    };
    return p;
}

async function create(label, teams, team, role, mode = 'normal') {
    const p = mkPlayer(label);
    p.val('create-name', label); p.val('create-teams', String(teams));
    p.doc.getElementById('create-teams').dispatchEvent(new p.w.Event('change'));
    if (p.doc.getElementById('create-mode')) p.val('create-mode', mode);
    p.val('create-team', team);
    if (p.doc.getElementById('create-role')) p.val('create-role', role);
    p.click('create-btn'); await sleep(150);
    if (role === 'spymaster' && p.doc.getElementById('role-toggle-btn') && p.st.myRole !== 'spymaster') {
        p.click('role-toggle-btn'); await sleep(80);
    }
    return p;
}
async function join(label, code, team, role) {
    const p = mkPlayer(label);
    p.val('join-name', label); p.val('join-id', code); p.val('join-team', team);
    if (p.doc.getElementById('join-role')) p.val('join-role', role);
    p.click('join-btn'); await sleep(150);
    if (role === 'spymaster' && p.doc.getElementById('role-toggle-btn') && p.st.myRole !== 'spymaster') {
        p.click('role-toggle-btn'); await sleep(80);
    }
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
async function hint(L, team, word, n) {
    const p = L.P[team].spy;
    if (p.st.myRole !== 'spymaster' && p.doc.getElementById('role-toggle-btn')) {
        p.click('role-toggle-btn');
        await settle();
    }
    p.val('hint-word', word);
    p.val('hint-number', String(n));
    p.click('submit-hint');
    await settle();
}
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
for (const [w, n, msg] of [['two words', 1, 'one word'], ['abcdefghijklmnop', 1, 'one word'], ['ZEPHYRIA', 0, 'Number must be'], ['ZEPHYRIA', 9, 'Number must be'], [s(L).cards.find((c) => !c.revealed).word, 1, 'on the board']]) {
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
// neutral: counts unchanged, guesses reaches 0 -> turn passes
c = s(L).cards.map((x, i) => ({ ...x, i })).find((x) => x.team === 'neutral' && !x.revealed); await reveal(L, T0, c.i);
check('neutral: turn passes when guesses reach 0, counts unchanged', s(L).turn === O0 && s(L).cardsLeft[T0] === 7 && s(L).cardsLeft[O0] === 8 && s(L).guessesRemaining === 0);

// other team's card: decrement theirs, turn CONTINUES because guesses remaining > 0!
await giveHintTo(L, O0, 2);
c = unrevealed(L, T0)[0]; await reveal(L, O0, c.i);
check("opponent's card: their count -1, turn continues, 1 guess left", s(L).cardsLeft[T0] === 6 && s(L).turn === O0 && s(L).guessesRemaining === 1);

// End Turn button
L.P[O0].gu.click('end-turn-btn'); await settle();
check('End Turn button passes turn, guesses 0', s(L).turn === T0 && s(L).guessesRemaining === 0);
check('system line "X team\'s turn" in chat', L.all[0].txt('chat-log').includes(`${T0.toUpperCase()} team's turn`));
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
check('play again: all players reset to guesser in start of next round', L.all.every((p) => p.st.myRole === 'guesser'));
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
    check('refresh: auto-rejoin same room/role', !r.hidden('game-screen') && r.st.code === L.code && r.st.myRole === sess.role && r.txt('chat-log').includes('Rejoined'));
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
check('3t: win by clearing all own cards', st.gameOver && st.winner.split(', ').every((t) => st.cardsLeft[t] === 0) && st.eliminated.length === 0, st.winner);

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
check('4t: win by clearing all 9 own cards', st.gameOver && st.winner.split(', ').every((t) => st.cardsLeft[t] === 0) && st.cards.every((x) => x.revealed), st.winner);

// ═════════ S4: reconnect / refresh / tab close ═════════
console.log('\n== S4: subscription + reconnect ==');
SCALE = 100; // 1s backoff = 10ms in the pages under test
const roster = (p) => p.doc.querySelectorAll('#active-players-list li').length;
const inRoom = (code) => [...channels].filter((c) => c.name === `room-${code}`).length;
const owned = (p, code) => [...channels].filter((c) => c.owner === p.label && c.name === `room-${code}`).length;
const drop = (p) => { [...channels].filter((c) => c.owner === p.label).forEach((c) => { channels.delete(c); firePresence(c.name); c.cb('CLOSED'); }); };
const closeTab = (p) => { [...channels].filter((c) => c.owner === p.label).forEach((c) => { channels.delete(c); firePresence(c.name); }); p.w.close(); };
async function room2(pfx) {
    const A = await create(pfx + 'A', 2, 'red', 'spymaster'), code = A.st.code;
    const B = await join(pfx + 'B', code, 'red', 'guesser');
    const C = await join(pfx + 'C', code, 'blue', 'spymaster');
    const D = await join(pfx + 'D', code, 'blue', 'guesser');
    return { code, all: [A, B, C, D], P: { red: { spy: A, gu: B }, blue: { spy: C, gu: D } } };
}

// ── a) drop + outage + recovery ──
{
    const R = await room2('a-'); const [A, B, C, D] = R.all; const bob = D;
    check('s4a: 1 channel per player after join (4 in room)', inRoom(R.code) === 4 && R.all.every((p) => owned(p, R.code) === 1));
    net.offline.add(bob.label); drop(bob);
    await sleep(15);
    const line = bob.doc.querySelector('.reconnecting');
    check('s4a: "Reconnecting…" line shown', line && line.textContent === 'Reconnecting…' && line.classList.contains('system'));
    check('s4a: presence roster shrinks to 3 in other tabs', [A, B, C].every((p) => roster(p) === 3));
    bob.ev('renderChat()');
    check('s4a: line survives chat re-render (last child)', bob.doc.getElementById('chat-log').lastChild === bob.doc.querySelector('.reconnecting'));
    await sleep(150); // several failed attempts
    check('s4a: retries happening w/ backoff, none leave a live channel', net.subscribes[bob.label] >= 4 && owned(bob, R.code) === 0 && inRoom(R.code) === 3, `${net.subscribes[bob.label]} ${inRoom(R.code)}`);
    // a move Bob misses while away
    const T = A.st.turn; await hint(R, T, 'ZEPHYRIA', 1);
    check('s4a: Bob missed the hint while offline', bob.st.guessesRemaining === 0 && A.st.guessesRemaining === 1);
    bob.ev('let __n = 0; const __o = renderBoard; renderBoard = function () { __n++; return __o(); }');
    net.offline.delete(bob.label);
    await sleep(700);
    check('s4a: reconnected: line removed, exactly 1 channel owned, 4 in room', !bob.doc.querySelector('.reconnecting') && owned(bob, R.code) === 1 && inRoom(R.code) === 4, `${owned(bob, R.code)} ${inRoom(R.code)}`);
    check('s4a: state re-fetched (missed hint now present)', bob.st.guessesRemaining === 1 && bob.txt('chat-log').includes('ZEPHYRIA - 1'));
    check('s4a: roster back to 4 everywhere', R.all.every((p) => roster(p) === 4));
    const before = bob.ev('__n');
    B.val('chat-text', 'ping'); B.click('submit-chat'); await settle(); // someone else's update
    check('s4a: one server update → exactly one render on Bob (no duplicate subscription)', bob.ev('__n') - before === 1, String(bob.ev('__n') - before));
    check('s4a: reconnected state in sync in all tabs', synced(R));
}

// ── b) 'online' event skips the backoff wait ──
{
    const R = await room2('b-'); const bob = R.all[3];
    net.offline.add(bob.label); drop(bob);
    while ((net.subscribes[bob.label] || 0) < 9) await sleep(5); // deep in backoff: waits are now 300ms real
    await sleep(40); // let the in-flight attempt fail so the loop is parked in its wait
    net.offline.delete(bob.label);
    bob.w.dispatchEvent(new bob.w.Event('online'));
    await sleep(80);
    check('s4b: `online` event triggers immediate retry (reconnected within 80ms)', !bob.doc.querySelector('.reconnecting') && owned(bob, R.code) === 1);
}

// ── c) 10 failures → "Connection lost" ──
{
    const R = await room2('c-'); const bob = R.all[3];
    net.offline.add(bob.label); const n0 = net.subscribes[bob.label] || 0; drop(bob);
    await sleep(2600);
    const line = bob.doc.querySelector('.reconnecting');
    check('s4c: after 10 failed tries → "Connection lost — reload the page"', line && line.textContent === 'Connection lost — reload the page', line && line.textContent);
    check('s4c: exactly 10 attempts', net.subscribes[bob.label] - n0 === 10, String(net.subscribes[bob.label] - n0));
    const n1 = net.subscribes[bob.label]; await sleep(200);
    check('s4c: no further retries', net.subscribes[bob.label] === n1);
    bob.ev('renderChat()');
    check('s4c: message persists', !!bob.doc.querySelector('.reconnecting'));
}

// ── d) leaving while reconnecting stops the loop ──
{
    const R = await room2('d-'); const bob = R.all[3];
    net.offline.add(bob.label); drop(bob);
    await sleep(30);
    bob.click('leave-btn'); bob.click('leave-btn');
    await sleep(60);
    const n = net.subscribes[bob.label]; await sleep(400);
    check('s4d: leave during reconnect → lobby, message gone, no more attempts, no channel', bob.hidden('game-screen') && !bob.doc.querySelector('.reconnecting') && net.subscribes[bob.label] === n && owned(bob, R.code) === 0);
}

// ── e) refresh mid-game ──
{
    const R = await room2('e-'); const [A, B, C, D] = R.all;
    const T = A.st.turn; await hint(R, T, 'ZEPHYRIA', 2);
    const sess = JSON.parse(D.w.sessionStorage.getItem('wg_session'));
    closeTab(D); // what a page unload does to its channel
    await sleep(40);
    check('s4e: closing tab updates roster (3) in others', [A, B, C].every((p) => roster(p) === 3) && inRoom(R.code) === 3);
    const D2 = mkPlayer('e-D2', { session: sess }); await sleep(300);
    check('s4e: refresh restores same room/team/role/state', !D2.hidden('game-screen') && D2.st.code === R.code && D2.st.myTeam === 'blue' && D2.st.myRole === 'guesser' && D2.st.guessesRemaining === 2 && JSON.stringify(D2.st.cards) === JSON.stringify(A.st.cards));
    check('s4e: exactly 1 channel for refreshed tab, 4 in room, roster 4 everywhere', owned(D2, R.code) === 1 && inRoom(R.code) === 4 && [A, B, C, D2].every((p) => roster(p) === 4));
    const before = JSON.stringify(D2.st.cards);
    const c = A.st.cards.map((x, i) => ({ ...x, i })).find((x) => x.team === T && !x.revealed); (T === 'red' ? B : D2).card(c.i).click(); await settle();
    check('s4e: refreshed tab receives live updates', JSON.stringify(D2.st.cards) !== before && D2.st.cards[c.i].revealed);
    // g) single channel per window
    check('s4g: every live window holds exactly one channel object, all registered', [A, B, C, D2].every((p) => owned(p, R.code) === 1 && p.ev('channel') !== null));
}

// ── f) close tab + reopen ──
{
    const R = await room2('f-'); const [A, B, C, D] = R.all;
    closeTab(B); await sleep(40);
    check('s4f: closed tab leaves roster (3 left, name gone)', [A, C, D].every((p) => roster(p) === 3 && !p.txt('active-players-list').includes('f-B')));
    const B2 = await join('f-B2', R.code, 'red', 'guesser');
    check('s4f: reopened tab joins, roster back to 4 everywhere, 4 channels', [A, C, D, B2].every((p) => roster(p) === 4) && inRoom(R.code) === 4 && owned(B2, R.code) === 1);
}

// ═════════ Race: two guessers click different cards within 50ms ═════════
console.log('\n== Race: simultaneous reveals ==');
{
    const gaps = [0, 0, 5, 10, 20, 30, 40, 45, 50, 0]; // ms between the two clicks
    const errMsgs = new Set(['Not your turn', 'Wait for a hint']);
    let i = 0, serverRejected = 0, clientGuarded = 0;
    for (const gap of gaps) {
        i++;
        const R = await room2(`r${i}-`); const [A, B, C, D] = R.all;
        const G2 = await join(`r${i}-B2`, R.code, 'red', 'guesser'); // second red guesser
        const all = [...R.all, G2];
        const T = A.st.turn; // whoever starts; make the two guessers of that team race
        const g1 = T === 'red' ? B : D;
        const g2 = T === 'red' ? G2 : await join(`r${i}-D2`, R.code, 'blue', 'guesser');
        if (T !== 'red') all.push(g2);
        await hint(R, T, 'ZEPHYRIA', 1);
        const mine = A.st.cards.map((x, k) => ({ ...x, k })).filter((x) => x.team === T && !x.revealed);
        const [c1, c2] = [mine[0].k, mine[1].k];
        const left0 = A.st.cardsLeft[T], chat0 = A.st.chatLog.length;
        [g1, g2].forEach((g) => g.ev('const __st = showToast; showToast = function (m, k) { window.__toasts = (window.__toasts || []).concat(m); return __st(m, k); }'));
        g1.card(c1).click();
        if (gap) await sleep(gap);
        g2.card(c2).click();
        await sleep(200);
        const st = A.st;
        const revealed = st.cards.filter((x) => x.revealed).length;
        const t1 = g1.w.__toasts || [], t2 = g2.w.__toasts || [];
        const failures = t1.concat(t2);
        const boardsEqual = all.every((p) => JSON.stringify(p.st.cards) === JSON.stringify(st.cards) && p.st.turn === st.turn && JSON.stringify(p.st.cardsLeft) === JSON.stringify(st.cardsLeft));
        const domLeft = all.every((p) => p.doc.querySelector(`.score[data-team=${T}] .score-n`).textContent === String(left0 - 1));
        const turnLines = st.chatLog.slice(chat0).filter((m) => m.type === 'system').length;
        check(`race #${i} (gap ${gap}ms): exactly 1 card revealed, cards_left ${left0}→${left0 - 1} once, 2nd click rejected (by server, or by client guard once it saw the update), clients converge`,
            revealed === 1 && st.cardsLeft[T] === left0 - 1 && failures.length <= 1 && failures.every((f) => errMsgs.has(f)) && boardsEqual && domLeft && turnLines === 1 && st.turn !== T,
            JSON.stringify({ revealed, left: st.cardsLeft, failures, boardsEqual, domLeft, turnLines, turn: st.turn }));
        if (failures.length) serverRejected++; else clientGuarded++;
        // the winner is whichever the server saw first; the DB row itself must agree with every client
        const row = (await be.select(R.code)).data;
        check(`race #${i}: DB row == clients (cards, cards_left, turn, guesses)`, JSON.stringify(row.board_cards) === JSON.stringify(st.cards) && JSON.stringify(row.cards_left) === JSON.stringify(st.cardsLeft) && row.turn === st.turn && row.guesses_remaining === st.guessesRemaining);
    }
    check(`race: both rejection paths exercised (server-rejected ${serverRejected}, client-guarded ${clientGuarded})`, serverRejected >= 1 && clientGuarded >= 1);
    // pure DB-level race: 2 RPCs fired in the same tick from 2 different sessions
    const R = await room2('rdb-'); const T = R.all[0].st.turn; await hint(R, T, 'ZEPHYRIA', 1);
    const mine = R.all[0].st.cards.map((x, k) => ({ ...x, k })).filter((x) => x.team === T);
    const [r1, r2] = await Promise.all([0, 1].map((n) => be.rpc('reveal_card', { p_code: R.code, p_team: T, p_index: mine[n].k })));
    const ok = [r1, r2].filter((r) => r.data).length, bad = [r1, r2].filter((r) => r.error);
    const row = (await be.select(R.code)).data;
    check('race DB: Promise.all of two reveal_card → exactly one success, one rejection, 1 card revealed, cards_left 8→7', ok === 1 && bad.length === 1 && /Not your turn|Wait for a hint/.test(bad[0].error.message) && row.board_cards.filter((x) => x.revealed).length === 1 && row.cards_left[T] === 7, JSON.stringify({ ok, bad: bad.map((b) => b.error.message), left: row.cards_left }));
}

// ═════════ Reconnect exactly when End Turn RPC resolves ═════════
console.log('\n== Reconnect during End Turn ==');
for (const loseResponse of [false, true]) {
    const tag = loseResponse ? 'response lost' : 'response delivered';
    const R = await room2(loseResponse ? 'et2-' : 'et1-'); const [A, B, C, D] = R.all;
    const T = A.st.turn, O = T === 'red' ? 'blue' : 'red';
    const tg = R.P[T].gu, other = R.P[O].spy; // tg = the team's guesser who ends the turn
    await hint(R, T, 'ZEPHYRIA', 2); // hint outstanding, 2 guesses left
    tg.ev('window.__T = []; const __s = showToast; showToast = function (m, k) { window.__T.push(m); return __s(m, k); }');
    tg.ev('window.__renders = 0; const __r = renderChat; renderChat = function () { window.__renders++; return __r(); }');
    net.hook = { owner: tg.label, name: 'end_turn', loseResponse };
    tg.click('end-turn-btn'); await sleep(40);
    let row = (await be.select(R.code)).data;
    check(`et (${tag}): server applied end_turn, turn → ${O}, guesses 0`, row.turn === O && row.guesses_remaining === 0);
    check(`et (${tag}): client is on "Reconnecting…" after the drop`, !!tg.doc.querySelector('.reconnecting'));
    if (loseResponse) check(`et (${tag}): client shows stale state until reconnect (still thinks ${T}'s turn)`, tg.st.turn === T && tg.st.guessesRemaining === 2);
    else check(`et (${tag}): client already applied RPC result`, tg.st.turn === O);
    net.offline.delete(tg.label);
    await sleep(700);
    row = (await be.select(R.code)).data;
    const st = tg.st;
    check(`et (${tag}): active team matches server (${row.turn})`, st.turn === row.turn && tg.txt('turn-indicator').startsWith(row.turn.toUpperCase()));
    check(`et (${tag}): guesses remaining matches server (${row.guesses_remaining})`, st.guessesRemaining === row.guesses_remaining && tg.txt('turn-indicator').includes('waiting for hint'));
    const hints = row.chat_log.filter((m) => m.type === 'hint');
    check(`et (${tag}): hint text matches server ("${hints[0].text}") exactly once`, hints.length === 1 && tg.txt('chat-log').split(hints[0].text).length === 2 && st.chatLog.filter((m) => m.type === 'hint')[0].text === hints[0].text);
    check(`et (${tag}): scoreboard matches server cards_left`, [...tg.doc.querySelectorAll('.score')].every((e) => e.querySelector('.score-n').textContent === String(row.cards_left[e.dataset.team])));
    const doms = [...tg.doc.querySelectorAll('#chat-log .hint-msg')].filter((e) => !e.classList.contains('reconnecting')).map((e) => e.textContent);
    const turnLines = row.chat_log.filter((m) => m.type === 'system' && m.text === `${O.toUpperCase()} team's turn`).length;
    check(`et (${tag}): no duplicate chat message (DOM ${doms.length} lines == server ${row.chat_log.length}; one "${O.toUpperCase()} team's turn")`,
        doms.length === row.chat_log.length && turnLines === 1 && doms.filter((t) => t === `${O.toUpperCase()} team's turn`).length === 1 && new Set(doms.filter((t) => /team's turn|ZEPHYRIA/.test(t))).size === doms.filter((t) => /team's turn|ZEPHYRIA/.test(t)).length,
        JSON.stringify(doms));
    const toasts = tg.w.__T;
    check(`et (${tag}): toasts: ${loseResponse ? 'exactly one (the failed RPC), none added by reconnect' : 'none'}`, loseResponse ? toasts.length === 1 && toasts[0] === 'offline' : toasts.length === 0, JSON.stringify(toasts));
    check(`et (${tag}): exactly 1 channel for that tab, roster 4, no reconnect line`, owned(tg, R.code) === 1 && inRoom(R.code) === 4 && !tg.doc.querySelector('.reconnecting') && R.all.every((p) => roster(p) === 4));
    // next event after recovery must arrive once
    const n0 = tg.w.__renders;
    await hint(R, O, 'PLANETX', 1);
    check(`et (${tag}): next hint arrives once on recovered client`, tg.w.__renders - n0 === 1 && tg.txt('chat-log').split('PLANETX - 1').length === 2 && tg.st.guessesRemaining === 1, String(tg.w.__renders - n0));
    check(`et (${tag}): all tabs converge`, synced(R));
}

// ═════════ S5: accessibility ═════════
console.log('\n== S5: accessibility ==');
{
    const R = await room2('a11y-'); const [A, B, C, D] = R.all;
    const T = A.st.turn, O = T === 'red' ? 'blue' : 'red';
    const tg = R.P[T].gu, spy = R.P[T].spy, other = R.P[O].gu;
    const key = (p, k, opts = {}) => { const e = new p.w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...opts }); p.doc.activeElement.dispatchEvent(e); return e; };
    const cards = (p) => [...p.doc.querySelectorAll('.card')];
    check('a11y: no hint yet → every card disabled for everyone', R.all.every((p) => cards(p).every((c) => c.disabled)));
    check('a11y: board is a labelled group, focusable container; cards are buttons', spy.doc.getElementById('board').getAttribute('role') === 'group' && spy.doc.getElementById('board').tabIndex === -1 && cards(spy).every((c) => c.tagName === 'BUTTON'));
    check('a11y: turn pill is a polite live region', spy.doc.getElementById('turn-indicator').getAttribute('aria-live') === 'polite');
    check('a11y: scoreboard has spoken labels ("RED cards left 8"), dot hidden', /RED cards left/.test(spy.txt('scoreboard')) && spy.doc.querySelector('.score-dot').getAttribute('aria-hidden') === 'true');
    check('a11y: spymaster card labels carry the colour, guesser labels do not', /, (red|blue|neutral|assassin)$/.test(cards(spy)[0].getAttribute('aria-label')) && !/,/.test(cards(tg)[0].getAttribute('aria-label')));
    // toast → announced
    spy.val('hint-word', 'two words'); spy.val('hint-number', '1'); spy.click('submit-hint'); await sleep(60);
    check('a11y: toast is aria-hidden, its text is announced in #sr-live', spy.doc.getElementById('toast').getAttribute('aria-hidden') === 'true' && spy.txt('sr-live') === spy.toast() && spy.toast().length > 0, spy.txt('sr-live'));
    // hint → announced to the whole room, cards enable for the turn guesser only
    await hint(R, T, 'ZEPHYRIA', 1); await sleep(60);
    check('a11y: hint announced to every tab', R.all.every((p) => p.txt('sr-live') === `${T.toUpperCase()} spymaster hint: ZEPHYRIA - 1`), R.all.map((p) => p.txt('sr-live')).join(' | '));
    check('a11y: turn guesser cards enabled, everyone else disabled', cards(tg).every((c) => !c.disabled) && [spy, other, R.P[O].spy].every((p) => cards(p).every((c) => c.disabled)));
    check('a11y: turn-change chat lines are not double-announced (pill covers them)', !R.all.some((p) => /team's turn/.test(p.txt('sr-live'))));
    // chat announced with name + team
    other.val('chat-text', 'hello'); other.click('submit-chat'); await sleep(60);
    check('a11y: chat message announced "name, team: text"', R.all.every((p) => p.txt('sr-live') === `${other.label}, ${O}: hello`), spy.txt('sr-live'));
    // keyboard on the board: focus stays on the board after the card list is rebuilt
    const own = tg.st.cards.findIndex((x) => x.team === T && !x.revealed);
    cards(tg)[own].focus(); cards(tg)[own].click(); await sleep(150);
    check('a11y: after a reveal rebuilds the board, focus is not dropped to <body>', tg.doc.activeElement !== tg.doc.body && tg.doc.getElementById('board').contains(tg.doc.activeElement) || tg.doc.activeElement === tg.doc.getElementById('board'), tg.doc.activeElement.id || tg.doc.activeElement.tagName);
    check('a11y: revealed card label includes colour', cards(tg)[own].getAttribute('aria-label') === `${tg.st.cards[own].word}, ${T}`);
    // rules modal: focus in, Tab trapped, Escape closes + restores focus
    const opener = spy.doc.getElementById('rules-btn-game'); opener.focus(); opener.click();
    check('a11y: rules modal opens with focus on Close', spy.doc.activeElement.id === 'close-rules-btn');
    check('a11y: dialog has role/aria-modal/labelledby/describedby resolving to real ids', ['rules-modal', 'game-over-modal'].every((id) => { const m = spy.doc.getElementById(id); return m.getAttribute('role') === 'dialog' && m.getAttribute('aria-modal') === 'true' && ['aria-labelledby', 'aria-describedby'].every((a) => spy.doc.getElementById(m.getAttribute(a))); }));
    const seen = [];
    for (let i = 0; i < 5; i++) { key(spy, 'Tab'); seen.push(spy.doc.activeElement.id || spy.doc.activeElement.className); }
    check('a11y: Tab never leaves the open rules dialog', seen.every((s) => ['close-rules-btn', 'rules-desc'].includes(s)) , seen.join());
    spy.doc.getElementById('rules-desc').focus(); const e1 = key(spy, 'Tab', { shiftKey: true });
    check('a11y: Shift+Tab from first element wraps to last', spy.doc.activeElement.id === 'close-rules-btn' && e1.defaultPrevented);
    key(spy, 'Escape');
    check('a11y: Escape closes rules and returns focus to the opener', spy.hidden('rules-modal') && spy.doc.activeElement === opener);
    // winner modal: focus in, trapped, Escape does NOT close, focus restored after Play Again
    other.doc.getElementById('chat-text').focus();
    const T2 = A.st.turn;
    await hint(R, T2, 'PLANETX', 1);
    const black = A.st.cards.findIndex((x) => x.team === 'black');
    R.P[T2].gu.card(black).click(); await sleep(150);
    check('a11y: game over → winner modal focuses Play Again; announced', !other.hidden('game-over-modal') && other.doc.activeElement.id === 'play-again-btn' && /wins!/.test(other.txt('sr-live')), other.txt('sr-live'));
    key(other, 'Escape');
    check('a11y: Escape does not close the winner modal', !other.hidden('game-over-modal'));
    key(other, 'Tab'); key(other, 'Tab');
    check('a11y: Tab cycles within winner modal', other.doc.getElementById('game-over-modal').contains(other.doc.activeElement));
    const back = other.doc.getElementById('chat-text'); // was focused before the modal opened
    other.click('play-again-btn'); await sleep(200);
    check('a11y: Play Again closes modal and restores focus to the previously focused control', other.hidden('game-over-modal') && other.doc.activeElement === back, other.doc.activeElement.id);
    check('a11y: restart announced', other.txt('sr-live').includes('Game restarted'));
    // leave → focus lands in the lobby
    other.click('leave-btn'); other.click('leave-btn'); await sleep(80);
    check('a11y: leaving moves focus to the lobby', other.doc.activeElement.id === 'create-name');
}

// ═════════ Client-side fixes (audit): defensive chat, ordering guard, first-connect failure, ?code= precedence ═════════
console.log('\n== Client fixes ==');
{
    const R = await room2('cf-'); const [A, B, C, D] = R.all;
    const row = (await be.select(R.code)).data;
    const clone = (o) => JSON.parse(JSON.stringify(o));
    const put = (p, r2) => { p.w.__row = clone(r2); return p.ev('syncStateWithDB(__row)'); };

    // ── 1. malformed chat never breaks rendering ──
    const bad = clone(row);
    bad.chat_log = [null, 5, 'str', [], { type: 'chat' }, { type: 'chat', team: null, name: null, text: 'boom' },
        { type: 'hint', team: 42, text: 'H' }, { type: 'system' }, { type: 'bogus', text: 'odd' }, { type: 'system', text: 'ok-system' },
        { type: 'chat', team: 'red', name: 'ok', text: '<b>fine</b>' }, { type: 'chat', team: 'zzz', name: {}, text: { x: 1 } }];
    let threw = null;
    try { put(A, bad); } catch (e) { threw = e; }
    check('chat: malformed entries (null, numbers, missing/typed-wrong fields) do not throw', threw === null, String(threw));
    const lines = [...A.doc.querySelectorAll('#chat-log .hint-msg')].map((e) => e.textContent);
    check('chat: well-formed entries still render, markup stays text', lines.includes('ok-system') && lines.includes('ok (RED): <b>fine</b>') && !A.doc.querySelector('#chat-log b'), JSON.stringify(lines));
    check('chat: null team/name degrade to "?" / "Anonymous"', lines.includes('Anonymous (?): boom') && lines.includes('? Spymaster: H'), JSON.stringify(lines));
    check('chat: board and scoreboard were rendered in the same sync', A.doc.querySelectorAll('.card').length === 25 && A.doc.querySelectorAll('.score').length === 2);
    const nonArr = clone(row); nonArr.chat_log = { not: 'an array' }; A.ev('seen = null');
    try { put(A, nonArr); check('chat: chat_log that is not an array renders as empty', A.doc.querySelectorAll('#chat-log .hint-msg').length === 0); } catch (e) { check('chat: non-array chat_log', false, String(e)); }
    // game over + malformed chat still shows the winner modal
    const over = clone(row); over.game_over = true; over.winner = 'blue'; over.chat_log = [null, { type: 'chat', team: null, text: 'x' }, { type: 'system', text: 'BLUE wins!' }];
    over.board_cards = over.board_cards.map((c) => ({ ...c, revealed: true }));
    B.ev('seen = null');
    try { put(B, over); } catch (e) { check('chat: game-over row with bad chat', false, String(e)); }
    check('chat: winner modal still opens when chat is malformed', !B.hidden('game-over-modal') && B.txt('winner-text') === 'BLUE TEAM WINS!');
    // the real server-side gap that motivated this: send_chat with a NULL team (SQL unchanged, this only feeds the client)
    const R2 = await room2('cf2-'); const nullChat = await be.rpc('send_chat', { p_code: R2.code, p_team: null, p_name: 'mallory', p_text: 'boom' });
    emit(nullChat.data); await sleep(60);
    check('chat: a chat line with NULL team from the real send_chat does not break any client', R2.all.every((p) => p.txt('chat-log').includes('mallory (?): boom') && p.doc.querySelectorAll('.card').length === 25));
    await hint(R2, R2.all[0].st.turn, 'ZEPHYRIA', 1);
    check('chat: room keeps working after the malformed line (hint arrives)', R2.all.every((p) => p.st.guessesRemaining === 1 && p.txt('chat-log').includes('ZEPHYRIA - 1')));

    // ── 2. ordering guard ──
    const R3 = await room2('cf3-'); const [a, b, c, d] = R3.all;
    const T = a.st.turn; await hint(R3, T, 'ZEPHYRIA', 2);
    const v1 = (await be.select(R3.code)).data;                                   // hint given
    const own = a.st.cards.map((x, i) => ({ ...x, i })).filter((x) => x.team === T && !x.revealed);
    R3.P[T].gu.card(own[0].i).click(); await settle();
    const v2 = (await be.select(R3.code)).data;                                   // one card revealed
    check('guard: server states v1 < v2 in rank', v2.board_cards.filter((x) => x.revealed).length === 1 && v2.chat_log.length === v1.chat_log.length);
    const here = a; // window under test, currently at v2
    put(here, v1);
    check('guard: older payload (v1) does not overwrite newer state (v2)', here.st.guessesRemaining === v2.guesses_remaining && here.st.cards.filter((x) => x.revealed).length === 1 && here.st.cardsLeft[T] === v2.cards_left[T]);
    put(here, v2);
    check('guard: equal state is a no-op (same rank)', here.doc.querySelector('.card') && here.st.turn === v2.turn);
    // newer applies
    R3.P[T].gu.click('end-turn-btn'); await settle(); // v3
    const vNow = (await be.select(R3.code)).data;
    check('guard: normal newer updates still apply in every tab', R3.all.every((p) => JSON.stringify(p.st.cards) === JSON.stringify(vNow.board_cards) && p.st.turn === vNow.turn));
    // restart = new board: newer timestamp wins; an old-board straggler afterwards is dropped
    const stale = clone(vNow);
    const rs = await be.rpc('restart_game', { p_code: R3.code, p_cards: clone(a.ev('generateBoard(2)')) });
    emit(rs.data); await sleep(80);
    check('guard: restart (new board, newer updated_at) applies in every tab', R3.all.every((p) => p.st.cards.every((x) => !x.revealed) && JSON.stringify(p.st.cards) === JSON.stringify(rs.data.board_cards)));
    put(a, stale);
    check('guard: a straggler from the OLD board (older updated_at) is ignored after a restart', JSON.stringify(a.st.cards) === JSON.stringify(rs.data.board_cards));

    // ── 2b. out-of-order RPC response vs realtime (the real race) ──
    for (const guardOn of [true, false]) {
        const R4 = await room2(guardOn ? 'cf4-' : 'cf5-'); const T4 = R4.all[0].st.turn, O4 = T4 === 'red' ? 'blue' : 'red';
        await hint(R4, T4, 'ZEPHYRIA', 2);
        const tg = R4.P[T4].gu;
        if (!guardOn) tg.ev('isStale = () => false'); // negative control: same scenario without the guard
        net.delay = { owner: tg.label, name: 'end_turn', ms: 250 };
        tg.click('end-turn-btn');            // server applies end_turn, echo reaches everyone, the HTTP reply is slow
        await sleep(60);
        await hint(R4, O4, 'PLANETX', 1);     // newer server state, delivered to tg by realtime first
        await sleep(400);                     // the slow end_turn response finally lands on tg
        const srv = (await be.select(R4.code)).data;
        const ok = tg.st.turn === srv.turn && tg.st.guessesRemaining === srv.guesses_remaining && tg.txt('chat-log').includes('PLANETX - 1');
        if (guardOn) check('race: slow RPC response arriving after a newer realtime event does not revert the client', ok, JSON.stringify({ turn: tg.st.turn, g: tg.st.guessesRemaining, srv: [srv.turn, srv.guesses_remaining] }));
        else check('race negative control: without the guard the same scenario DOES revert the client (test is sensitive)', !ok);
        if (guardOn) check('race: every tab equals the server row afterwards', R4.all.every((p) => p.st.turn === srv.turn && p.st.guessesRemaining === srv.guesses_remaining && JSON.stringify(p.st.cardsLeft) === JSON.stringify(srv.cards_left)));
    }
}

// ── 3. first-connection failure ──
{
    const A = await create('l1-A', 2, 'red', 'spymaster'); const code = A.st.code;
    net.failSubscribe.add('l1-B');
    const Bp = await join('l1-B', code, 'red', 'guesser'); await sleep(100);
    check('L1: failed first connect shows Retry / Back to lobby (not a blank board)', !Bp.hidden('game-screen') && !Bp.hidden('connect-error') && Bp.doc.activeElement.id === 'connect-retry' && Bp.doc.getElementById('connect-error').getAttribute('role') === 'alert');
    check('L1: the failure is announced and toasted once; connecting state cleared', /Could not connect/.test(Bp.toast()) && /Could not connect/.test(Bp.txt('sr-live')) && !Bp.doc.body.classList.contains('connecting') && !Bp.doc.getElementById('board').hasAttribute('aria-busy'));
    check('L1: no channel left registered for the failed tab', owned(Bp, code) === 0);
    Bp.click('connect-retry'); await sleep(100);
    check('L1: Retry while still failing keeps the panel', !Bp.hidden('connect-error') && owned(Bp, code) === 0);
    net.failSubscribe.delete('l1-B');
    Bp.click('connect-retry'); await sleep(150);
    check('L1: Retry after the network is back loads the room (panel hidden, board, roster 2, one channel)', Bp.hidden('connect-error') && Bp.doc.querySelectorAll('.card').length === 25 && owned(Bp, code) === 1 && roster(A) === 2 && roster(Bp) === 2);
    const Gp = await join('l1-G', code, 'blue', 'guesser'); Gp.val('chat-text', 'yo'); Gp.click('submit-chat'); await settle();
    check('L1: recovered client is live (receives chat from another player)', Bp.txt('chat-log').includes('yo') && Gp.txt('chat-log').includes('yo'));
    // Back to lobby from the failure panel
    net.failSubscribe.add('l1-C');
    const Cp = await join('l1-C', code, 'blue', 'guesser'); await sleep(100);
    Cp.click('connect-leave'); await sleep(80);
    check('L1: "Back to lobby" leaves cleanly (lobby shown, panel hidden, session cleared, focus in lobby)', !Cp.hidden('lobby-screen') && Cp.hidden('game-screen') && Cp.hidden('connect-error') && Cp.w.sessionStorage.getItem('wg_session') === null && Cp.doc.activeElement.id === 'create-name');
    net.failSubscribe.delete('l1-C');
    // nothing from a previously joined room may show on the failure screen
    const other = await create('l1-X', 2, 'red', 'spymaster'); const stale = await join('l1-S', other.st.code, 'red', 'guesser');
    check('L1 setup: player is in a room with a rendered board', stale.doc.querySelectorAll('.card').length === 25);
    stale.click('leave-btn'); stale.click('leave-btn'); await sleep(80);
    net.failSubscribe.add('l1-S');
    stale.val('join-name', 'l1-S'); stale.val('join-id', code); stale.val('join-team', 'blue'); stale.val('join-role', 'guesser'); stale.click('join-btn'); await sleep(150);
    check('L1: failure screen shows no board / chat / roster left over from the previous room', !stale.hidden('connect-error') && stale.doc.querySelectorAll('.card').length === 0 && stale.doc.querySelectorAll('#chat-log .hint-msg').length === 0 && stale.doc.querySelectorAll('#active-players-list li').length === 0);
    net.failSubscribe.delete('l1-S');
}

// ── 4. ?code= precedence over the stored session ──
{
    const RA = await room2('l5a-'); const RB = await room2('l5b-');
    const sessA = { code: RA.code, name: 'sess', team: 'red', role: 'guesser' };
    const other = mkPlayer('l5-other', { url: `http://localhost/?code=${RB.code.toLowerCase()}`, session: sessA }); await sleep(250);
    check('L5: explicit ?code= for another room wins: no auto-rejoin of the stored session', !other.hidden('lobby-screen') && other.hidden('game-screen') && other.st.code === '' && other.doc.getElementById('join-id').value === RB.code, other.st.code);
    check('L5: the stored session is left untouched (not cleared)', JSON.parse(other.w.sessionStorage.getItem('wg_session')).code === RA.code);
    const same = mkPlayer('l5-same', { url: `http://localhost/?code=${RA.code}`, session: sessA }); await sleep(300);
    check('L5: ?code= equal to the session (what a plain refresh looks like) still restores the room', !same.hidden('game-screen') && same.st.code === RA.code);
    const none = mkPlayer('l5-none', { session: sessA }); await sleep(300);
    check('L5: no ?code= at all still restores the session', !none.hidden('game-screen') && none.st.code === RA.code && none.txt('chat-log').includes('Rejoined'));
    const junk = mkPlayer('l5-junk', { url: 'http://localhost/?code=zz', session: sessA }); await sleep(300);
    check('L5: a malformed ?code= is not an explicit room, session still restores', !junk.hidden('game-screen') && junk.st.code === RA.code);
    // real refresh path: enterGame writes ?code= into the URL, reload keeps it
    const live = await join('l5-live', RA.code, 'blue', 'guesser');
    check('L5: entering a room writes ?code=<room> (so refresh == same code)', live.w.location.search === `?code=${RA.code}`);
    const reload = mkPlayer('l5-reload', { url: `http://localhost/${live.w.location.search}`, session: JSON.parse(live.w.sessionStorage.getItem('wg_session')) }); await sleep(300);
    check('L5: refresh (url ?code=room + session) rejoins the same room and role', reload.st.code === RA.code && reload.st.myTeam === 'blue' && !reload.hidden('game-screen'));
}

// ═════════ Cleanup pass: empty chat entries, malformed cards ═════════
console.log('\n== Cleanup: empty chat entries + cards without a word ==');
{
    const R = await room2('cu-'); const [A, B, C, D] = R.all;
    const clone = (o) => JSON.parse(JSON.stringify(o));
    const put = (p, r2) => { p.w.__row = clone(r2); p.ev('seen = null'); return p.ev('syncStateWithDB(__row)'); };
    const row = (await be.select(R.code)).data;

    // ── empty chat entries never render ──
    const chat = clone(row);
    chat.chat_log = [
        { type: 'chat' }, { type: 'chat', text: '' }, { type: 'chat', team: 'red', name: 'x', text: '   ' }, { type: 'chat', team: null, name: null },
        { type: 'hint', team: 'red' }, { type: 'hint', team: 'red', text: '' }, { type: 'hint', team: 'red', text: null },
        { type: 'system' }, { type: 'system', text: '' }, { type: 'system', text: '  ' }, { type: 'bogus' },
        { type: 'chat', team: 'red', name: 'ann', text: 'real message' }, { type: 'hint', team: 'blue', text: 'OCEAN - 2' }, { type: 'system', text: 'real system line' }];
    let threw = null; try { put(A, chat); } catch (e) { threw = e; }
    const lines = [...A.doc.querySelectorAll('#chat-log .hint-msg')].map((e) => e.textContent);
    check('empty chat: no throw', threw === null, String(threw));
    check('empty chat: only the 3 real entries render (no bare "Anonymous (…):", "? Spymaster:" or blank lines)', lines.length === 3 && lines[0] === 'ann (RED): real message' && lines[1] === 'BLUE Spymaster: OCEAN - 2' && lines[2] === 'real system line', JSON.stringify(lines));
    check('empty chat: nothing empty is announced either', !/Anonymous|\?/.test(A.txt('sr-live')));
    // the real server gap: a hint with a NULL word stores text null
    const R2 = await room2('cu2-'); const T2 = R2.all[0].st.turn;
    const nullHint = await be.rpc('give_hint', { p_code: R2.code, p_team: T2, p_word: null, p_n: 1 }); emit(nullHint.data); await sleep(80);
    check('empty chat: a hint with NULL word (real give_hint) renders no line and breaks nothing', R2.all.every((p) => !/Spymaster:\s*$/.test(p.txt('chat-log')) && p.doc.querySelectorAll('.card').length === 25));

    // ── cards without a word ──
    const cards = clone(row);
    cards.board_cards[2] = { team: cards.board_cards[2].team, revealed: false };            // no word
    cards.board_cards[3] = null;                                                                // not an object
    cards.board_cards[4] = { word: 42, team: 'red', revealed: false };                          // wrong type
    cards.board_cards[5] = { word: 'NOTEAM', team: 'purple', revealed: false };                // bad team
    threw = null; try { put(A, cards); } catch (e) { threw = e; }
    check('malformed card: rendering does not throw', threw === null, String(threw));
    const els = [...A.doc.querySelectorAll('.card')];
    check('malformed card: 25 cards still rendered, no "undefined"/"null" text, bad team gets no data-team', els.length === 25 && els.every((e) => !/undefined|null/.test(e.textContent)) && !els[5].hasAttribute('data-team') && els[5].textContent === 'NOTEAM' && els[2].textContent === '' && els[2].getAttribute('aria-label') !== '' , els.slice(2, 6).map((e) => e.textContent).join('|'));
    // hint flow with such a board: spymaster whose turn it is
    const T = A.st.turn; const spy = R.P[T].spy;
    spy.w.__row = clone(cards); spy.ev('seen = null; syncStateWithDB(__row)');
    spy.val('hint-word', 'ZEPHYRIA'); spy.val('hint-number', '1');
    let hintErr = null, res; try { res = await spy.ev('submitHint()'); } catch (e) { hintErr = e; }
    check('malformed card: submitHint does not throw', hintErr === null, String(hintErr));
    await settle();
    check('malformed card: hint flow completes (client-side check skips the bad cards, server accepts the hint)', spy.st.guessesRemaining === 1 && spy.txt('chat-log').includes('ZEPHYRIA - 1'), String(spy.st.guessesRemaining));
    // a board word must still be rejected when other cards are malformed
    const spy2 = R.P[T === 'red' ? 'blue' : 'red'].spy; const wordOnBoard = cards.board_cards[10].word;
    spy2.w.__row = clone(cards); spy2.ev('seen = null; syncStateWithDB(__row)'); // (not this team's turn: toast, but no throw)
    let e2 = null; try { await spy2.ev('submitHint()'); } catch (e) { e2 = e; }
    check('malformed card: still no throw on the not-your-turn path', e2 === null);
    // clicking a malformed card as the guesser is safe
    const gu = R.P[T].gu; gu.w.__row = clone(cards); gu.ev('seen = null; syncStateWithDB(__row)');
    let clickErr = null; try { gu.card(2).click(); gu.card(3).click(); await settle(); } catch (e) { clickErr = e; }
    check('malformed card: clicking blank/null cards does not throw', clickErr === null, String(clickErr));
}

// ═════════ turn timer (server side) ═════════
{
    console.log('\n[turn timer]');
    const cards = Array.from({ length: 25 }, (_, i) => ({ word: 'T' + i, team: i < 8 ? 'red' : i < 16 ? 'blue' : i < 17 ? 'black' : 'neutral', revealed: false }));
    const base = { teams: 2, grid: 5, board_cards: cards, cards_left: { red: 8, blue: 8 }, turn: 'red', chat_log: [] };
    await be.insert({ ...base, game_code: 'TIMER1', turn_seconds: 30 });
    await be.insert({ ...base, game_code: 'TIMER0' });
    let r = await be.rpc('timeout_turn', { p_code: 'TIMER1' });
    check('timer: early timeout_turn is a no-op', r.data.turn === 'red' && r.data.chat_log.length === 0);
    await pg.query("update games set turn_started_at = now() - interval '31 seconds' where game_code in ('TIMER1','TIMER0')");
    r = await be.rpc('timeout_turn', { p_code: 'TIMER1' });
    check('timer: before start_timer, timeout_turn does not skip', r.data.turn === 'red');
    await be.rpc('start_timer', { p_code: 'TIMER1' });
    await pg.query("update games set turn_started_at = now() - interval '31 seconds' where game_code in ('TIMER1','TIMER0')");
    r = await be.rpc('timeout_turn', { p_code: 'TIMER1' });
    check('timer: expired turn skips to next team with fresh clock', r.data.turn === 'blue' && r.data.guesses_remaining === 0
        && Date.now() - new Date(r.data.turn_started_at).getTime() < 5000 && r.data.chat_log.some((m) => m.text === 'RED ran out of time'));
    r = await be.rpc('timeout_turn', { p_code: 'TIMER1' });
    check('timer: repeated call after skip does not skip again', r.data.turn === 'blue');
    r = await be.rpc('timeout_turn', { p_code: 'TIMER0' });
    check('timer: untimed game never times out', r.data.turn === 'red');
    await pg.query("update games set turn_started_at = now() - interval '20 seconds' where game_code = 'TIMER1'");
    await be.rpc('give_hint', { p_code: 'TIMER1', p_team: 'blue', p_word: 'ZEBRA', p_n: 1 });
    await pg.query("update games set turn_started_at = turn_started_at - interval '20 seconds' where game_code = 'TIMER1'");
    r = await be.rpc('timeout_turn', { p_code: 'TIMER1' });
    check('timer: a hint restarts the clock', r.data.turn === 'blue' && r.data.guesses_remaining === 1);
}

// ═════════ Theme toggle & in-room role selection ═════════
{
    console.log('\n[theme toggle & in-room role selection]');
    const p1 = mkPlayer('theme-tester');
    check('theme: default data-theme is set', ['dark', 'light'].includes(p1.doc.documentElement.dataset.theme));
    const btn = p1.doc.getElementById('theme-toggle-lobby');
    check('theme: lobby toggle button present', !!btn);
    const initialTheme = p1.doc.documentElement.dataset.theme;
    btn.click();
    const toggledTheme = p1.doc.documentElement.dataset.theme;
    check('theme: clicking toggle changes theme', toggledTheme !== initialTheme);
    check('theme: persisted in localStorage', p1.w.localStorage.getItem('codenames-theme') === toggledTheme);
    btn.click();
    check('theme: toggling back restores initial theme', p1.doc.documentElement.dataset.theme === initialTheme);

    // Lobby has NO role select fields
    check('role: create-role select not in lobby', p1.doc.getElementById('create-role') === null);
    check('role: join-role select not in lobby', p1.doc.getElementById('join-role') === null);

    // Create game without role selection -> enters as guesser
    p1.val('create-name', 'Alice');
    p1.val('create-teams', '2');
    p1.doc.getElementById('create-teams').dispatchEvent(new p1.w.Event('change'));
    p1.val('create-team', 'red');
    p1.click('create-btn');
    await sleep(150);

    check('role: player enters room as guesser by default', p1.st.myRole === 'guesser');
    check('role: role toggle button present in room', !!p1.doc.getElementById('role-toggle-btn'));
    check('role: button offers Become Spymaster', p1.txt('role-toggle-btn').includes('Become Spymaster'));

    // First player from team red chooses Spymaster
    p1.click('role-toggle-btn');
    await sleep(80);
    check('role: first player becomes spymaster', p1.st.myRole === 'spymaster');
    check('role: button now offers Switch to Guesser', p1.txt('role-toggle-btn').includes('Switch to Guesser'));
    check('role: body has spymaster class', p1.doc.body.classList.contains('spymaster'));

    // Second player joins team red
    const p2 = mkPlayer('Bob');
    p2.val('join-name', 'Bob');
    p2.val('join-id', p1.st.code);
    p2.val('join-team', 'red');
    p2.click('join-btn');
    await sleep(150);

    check('role: second player enters as guesser', p2.st.myRole === 'guesser');
    check('role: second player sees Spymaster is taken', p2.doc.getElementById('role-toggle-btn').disabled === true);
    check('role: second player button text shows Spymaster Alice', p2.txt('role-toggle-btn').includes('Alice'));

    // Second player tries to claim Spymaster -> blocked
    await p2.ev("claimRole('spymaster')");
    await sleep(80);
    check('role: second player blocked from becoming spymaster', p2.st.myRole === 'guesser');
    check('role: second player sees toast warning', p2.toast().includes('already has a Spymaster'));

    // First player steps down to guesser
    p1.click('role-toggle-btn');
    await sleep(80);
    check('role: first player stepped down to guesser', p1.st.myRole === 'guesser');
    check('role: second player button now enabled to claim Spymaster', p2.doc.getElementById('role-toggle-btn').disabled === false);

    // Second player now claims Spymaster
    p2.click('role-toggle-btn');
    await sleep(80);
    check('role: second player successfully claims vacant spymaster slot', p2.st.myRole === 'spymaster');
}

// ═════════ Suspense Mode & 15-char Hint & Turn Continuation ═════════
console.log('\n[suspense mode & 15-char hint limit & turn continuation]');
{
    // Mode select in lobby
    const pLobby = mkPlayer('Tester');
    check('mode: create-mode select in lobby', pLobby.doc.getElementById('create-mode') !== null);
    check('mode: options include normal and suspense',
        pLobby.doc.querySelector('#create-mode option[value="normal"]') !== null &&
        pLobby.doc.querySelector('#create-mode option[value="suspense"]') !== null);

    // 15-char hint limit verification
    check('hint: 15 letters valid regex', pLobby.ev("HINT_RE.test('A'.repeat(15))"));
    check('hint: 16 letters rejected regex', !pLobby.ev("HINT_RE.test('A'.repeat(16))"));

    // Create Suspense game
    const sSpy = await create('red-spy-s', 2, 'red', 'spymaster', 'suspense');
    const sCode = sSpy.st.code;
    const sGu = await join('red-gu-s', sCode, 'red', 'guesser');
    const bSpy = await join('blue-spy-s', sCode, 'blue', 'spymaster');
    const bGu = await join('blue-gu-s', sCode, 'blue', 'guesser');
    await sleep(150);

    const sRow = await be.select(sCode);
    check('suspense: game created with game_mode = suspense in DB', sRow.data.game_mode === 'suspense');
    check('suspense: display-game-mode badge shows SUSPENSE in all tabs',
        [sSpy, sGu, bSpy, bGu].every((p) => p.txt('display-game-mode') === 'SUSPENSE'));

    // Guesser has no active suspense controls before hint
    check('suspense: controls hidden before hint', sGu.doc.getElementById('suspense-controls').classList.contains('hidden'));

    // Find starting team
    const startTeam = sGu.st.turn;
    const otherTeam = startTeam === 'red' ? 'blue' : 'red';
    const startSpy = startTeam === 'red' ? sSpy : bSpy;
    const startGu = startTeam === 'red' ? sGu : bGu;

    // Spymaster gives hint with 3 words
    startSpy.val('hint-word', 'TARGET');
    startSpy.val('hint-number', '3');
    startSpy.click('submit-hint');
    await settle();

    check('suspense: hint accepted, 3 guesses left', startGu.st.guessesRemaining === 3);
    check('suspense: controls visible for active guesser', !startGu.doc.getElementById('suspense-controls').classList.contains('hidden'));
    check('suspense: initial selection count 0', startGu.txt('suspense-count').includes('Selected: 0 / 3 words'));
    check('suspense: submit button disabled initially', startGu.doc.getElementById('submit-guesses-btn').disabled === true);

    // Guesser clicks card 0 to select
    startGu.card(0).click();
    await sleep(50);
    check('suspense: card 0 selected class added', startGu.card(0).classList.contains('selected'));
    check('suspense: selection count updated to 1', startGu.txt('suspense-count').includes('Selected: 1 / 3 words'));
    check('suspense: submit button enabled', startGu.doc.getElementById('submit-guesses-btn').disabled === false);

    // Guesser clicks card 1 to select
    startGu.card(1).click();
    await sleep(50);
    check('suspense: card 1 selected class added', startGu.card(1).classList.contains('selected'));
    check('suspense: selection count updated to 2', startGu.txt('suspense-count').includes('Selected: 2 / 3 words'));

    // Guesser clicks card 1 again to deselect
    startGu.card(1).click();
    await sleep(50);
    check('suspense: card 1 selected class removed after toggle', !startGu.card(1).classList.contains('selected'));
    check('suspense: selection count decremented to 1', startGu.txt('suspense-count').includes('Selected: 1 / 3 words'));

    // Guesser clicks Clear
    startGu.click('clear-selection-btn');
    await sleep(50);
    check('suspense: clear button resets selection to 0', startGu.txt('suspense-count').includes('Selected: 0 / 3 words'));
    check('suspense: card 0 selected class removed by clear', !startGu.card(0).classList.contains('selected'));
    check('suspense: submit button disabled after clear', startGu.doc.getElementById('submit-guesses-btn').disabled === true);

    // Guesser selects 2 cards (e.g. card 0 and card 1, ensuring neither is assassin for now)
    const safeCards = startGu.st.cards.map((c, i) => ({ ...c, i })).filter((c) => c.team !== 'black').slice(0, 2);
    startGu.card(safeCards[0].i).click();
    startGu.card(safeCards[1].i).click();
    await sleep(50);
    check('suspense: 2 safe cards selected', startGu.txt('suspense-count').includes('Selected: 2 / 3 words'));

    // Submit batch
    startGu.click('submit-guesses-btn');
    await settle();

    // Verify both cards revealed in DB and turn concluded
    const updatedRow = await be.select(sCode);
    check('suspense: card 1 revealed on server', updatedRow.data.board_cards[safeCards[0].i].revealed === true);
    check('suspense: card 2 revealed on server', updatedRow.data.board_cards[safeCards[1].i].revealed === true);
    check('suspense: turn concluded and passed to next team', updatedRow.data.turn === otherTeam);
    check('suspense: guesses remaining reset to 0', updatedRow.data.guesses_remaining === 0);
    check('suspense: controls hidden after turn end', startGu.doc.getElementById('suspense-controls').classList.contains('hidden'));
}

// ═════════ role reset on next round & host start button ═════════
{
    console.log('\n[role reset & host start button in timed games]');
    const pHost = mkPlayer('HostAlice');
    pHost.val('create-name', 'HostAlice');
    pHost.val('create-teams', '2');
    pHost.doc.getElementById('create-teams').dispatchEvent(new pHost.w.Event('change'));
    pHost.val('create-team', 'red');
    pHost.val('create-timer', '60');
    pHost.click('create-btn');
    await sleep(150);

    const roomCode = pHost.st.code;
    const pGuest = mkPlayer('GuestBob');
    pGuest.val('join-name', 'GuestBob');
    pGuest.val('join-id', roomCode);
    pGuest.val('join-team', 'blue');
    pGuest.click('join-btn');
    await sleep(150);

    // Verify initial states
    check('start-btn: host player is recognized as host', pHost.st.isHost === true);
    check('start-btn: guest player is not host', pGuest.st.isHost === false);
    check('start-btn: timer_started is false initially', pHost.st.timerStarted === false && pGuest.st.timerStarted === false);

    // Verify start button visibility and state
    const hostStartBtn = pHost.doc.getElementById('start-timer-btn');
    const guestStartBtn = pGuest.doc.getElementById('start-timer-btn');
    check('start-btn: button visible for both', !hostStartBtn.classList.contains('hidden') && !guestStartBtn.classList.contains('hidden'));
    check('start-btn: enabled for host with Start text', hostStartBtn.disabled === false && hostStartBtn.textContent.includes('Start'));
    check('start-btn: disabled for guest with Waiting text', guestStartBtn.disabled === true && guestStartBtn.textContent.includes('Waiting'));
    check('start-btn: timer badge shows ready/waiting', pHost.txt('turn-timer').includes('1:00') && pGuest.txt('turn-timer').includes('1:00'));

    // Guest clicking start button is no-op
    guestStartBtn.click();
    await sleep(50);
    check('start-btn: guest click does not start timer', pHost.st.timerStarted === false);

    // Host clicks start button
    hostStartBtn.click();
    await settle();

    // Verify timer is started on all tabs
    check('start-btn: host click starts timer across all tabs', pHost.st.timerStarted === true && pGuest.st.timerStarted === true);
    check('start-btn: button is hidden after start', hostStartBtn.classList.contains('hidden') && guestStartBtn.classList.contains('hidden'));

    // Verify chat does not reset timerStarted or turnStartedAt
    const t0 = pHost.st.turnStartedAt;
    pHost.val('chat-text', 'Hello from host');
    pHost.click('submit-chat');
    await settle();
    check('timer: chat does not reset timerStarted', pHost.st.timerStarted === true && pGuest.st.timerStarted === true);
    check('timer: chat does not reset turnStartedAt', pHost.st.turnStartedAt === t0 && pGuest.st.turnStartedAt === t0);

    // Give a 2-word hint and reveal 1 own-team card (guesses remaining = 1)
    const curTeam = pHost.st.turn;
    const isHostTurn = curTeam === pHost.st.myTeam;
    const actor = isHostTurn ? pHost : pGuest;
    const actorRoleBtn = actor.doc.getElementById('role-toggle-btn');
    actorRoleBtn.click(); await sleep(80);
    actor.val('hint-word', 'TESTCLUE');
    actor.val('hint-number', '2');
    actor.click('submit-hint');
    await settle();
    const tAfterHint = actor.st.turnStartedAt;
    actorRoleBtn.click(); await sleep(80);

    const ownCard = actor.st.cards.map((c, i) => ({ ...c, i })).find((c) => c.team === curTeam && !c.revealed);
    await actor.ev(`rpc('reveal_card', { p_code: '${roomCode}', p_team: '${curTeam}', p_index: ${ownCard.i} })`);
    await settle();

    check('timer: card reveal does not reset timerStarted', pHost.st.timerStarted === true && pGuest.st.timerStarted === true);
    check('timer: card reveal within same turn preserves turnStartedAt', pHost.st.turnStartedAt === tAfterHint);

    // Now test role reset at start of next round
    // Both become spymasters
    pHost.click('role-toggle-btn'); await sleep(80);
    pGuest.click('role-toggle-btn'); await sleep(80);
    check('role-reset: host is spymaster', pHost.st.myRole === 'spymaster');
    check('role-reset: guest is spymaster', pGuest.st.myRole === 'spymaster');

    // Win the game: end round
    // Reveal assassin for current turn team
    const tTurn = pHost.st.turn;
    const assassinCard = pHost.st.cards.map((c, i) => ({ ...c, i })).find((c) => c.team === 'black');
    await pHost.ev(`rpc('give_hint', { p_code: '${roomCode}', p_team: '${tTurn}', p_word: 'CLUE', p_n: 1 })`);
    await pHost.ev(`rpc('reveal_card', { p_code: '${roomCode}', p_team: '${tTurn}', p_index: ${assassinCard.i} })`);
    await settle();

    check('role-reset: game over reached', pHost.st.gameOver === true);

    // Host clicks Play Again
    pHost.click('play-again-btn');
    await settle();

    // In start of next round: all players must be guessers!
    check('role-reset: host reset to guesser in next round', pHost.st.myRole === 'guesser' && !pHost.doc.body.classList.contains('spymaster'));
    check('role-reset: guest reset to guesser in next round', pGuest.st.myRole === 'guesser' && !pGuest.doc.body.classList.contains('spymaster'));
    check('role-reset: spymaster buttons offer Become Spymaster', pHost.txt('role-toggle-btn').includes('Become Spymaster') && pGuest.txt('role-toggle-btn').includes('Become Spymaster'));

    // And in next round of timed game: timer requires host start again!
    check('role-reset: timer paused again in next round', pHost.st.timerStarted === false && pGuest.st.timerStarted === false);
    check('role-reset: start button visible again for host in next round', !pHost.doc.getElementById('start-timer-btn').classList.contains('hidden') && pHost.doc.getElementById('start-timer-btn').disabled === false);
}

// ═════════ End-of-round winner declaration & starting team randomization ═════════
{
    console.log('\n[end-of-round winner declaration & starting team randomization]');
    // Create a 3-team game: red, blue, green
    const pRed = await create('p-red', 3, 'red', 'guesser');
    const rCode = pRed.st.code;
    const pBlue = await join('p-blue', rCode, 'blue', 'guesser');
    const pGreen = await join('p-green', rCode, 'green', 'guesser');

    // Test starting team randomization across restart_game calls
    const starts = new Set();
    for (let i = 0; i < 20; i++) {
        const res = await be.rpc('restart_game', { p_code: rCode, p_cards: structuredClone(pRed.ev('generateBoard(3)')) });
        starts.add(res.data.turn);
    }
    check('random-start: restart_game produces multiple starting teams across rounds', starts.size >= 2, Array.from(starts).join());

    // Now test end-of-round tie declaration in a 3-team game:
    // Restart with Red starting
    await pRed.ev(`rpc('restart_game', { p_code: '${rCode}', p_cards: generateBoard(3), p_start_team: 'red' })`);
    await settle();

    // Red's turn: clear ALL 8 Red cards!
    const redCards = pRed.st.cards.map((c, i) => ({ ...c, i })).filter((c) => c.team === 'red');
    await pRed.ev(`rpc('give_hint', { p_code: '${rCode}', p_team: 'red', p_word: 'FIRE', p_n: 8 })`);
    for (const c of redCards) {
        await pRed.ev(`rpc('reveal_card', { p_code: '${rCode}', p_team: 'red', p_index: ${c.i} })`);
    }
    await settle();

    // Red has 0 cards left! BUT it should NOT be game over yet because Blue and Green have not played their turn in this round!
    check('end-of-round: Red cleared all cards, but game_over is FALSE mid-round', pRed.st.gameOver === false && pRed.st.cardsLeft.red === 0);
    check('end-of-round: turn passed to blue', pRed.st.turn === 'blue');

    // Blue's turn: clear ALL 8 Blue cards!
    const blueCards = pBlue.st.cards.map((c, i) => ({ ...c, i })).filter((c) => c.team === 'blue');
    await pBlue.ev(`rpc('give_hint', { p_code: '${rCode}', p_team: 'blue', p_word: 'WATER', p_n: 8 })`);
    for (const c of blueCards) {
        await pBlue.ev(`rpc('reveal_card', { p_code: '${rCode}', p_team: 'blue', p_index: ${c.i} })`);
    }
    await settle();

    // Blue also has 0 cards left! Still NOT game over because Green has not finished their turn in this round!
    check('end-of-round: Blue also cleared all cards, but game_over is still FALSE', pRed.st.gameOver === false && pRed.st.cardsLeft.blue === 0);
    check('end-of-round: turn passed to green', pRed.st.turn === 'green');

    // Green takes their turn, gives a hint, but ends turn without clearing all cards
    await pGreen.ev(`rpc('give_hint', { p_code: '${rCode}', p_team: 'green', p_word: 'EARTH', p_n: 1 })`);
    await pGreen.ev(`rpc('end_turn', { p_code: '${rCode}', p_team: 'green' })`);
    await settle();

    // NOW the entire turn cycle of all 3 teams has ended! Game over must be TRUE!
    check('end-of-round: after Green ends turn, round is complete and game_over is TRUE', pRed.st.gameOver === true);
    check('end-of-round: multiple winners declared (red, blue tie)', pRed.st.winner.includes('red') && pRed.st.winner.includes('blue') && !pRed.st.winner.includes('green'), pRed.st.winner);
    check('end-of-round: modal shows TIE heading', pRed.txt('winner-text').includes('RED & BLUE TEAMS WIN! (TIE)'));
    check('end-of-round: confetti called for Red player', pRed.w.confettiCalls > 0);
    check('end-of-round: confetti called for Blue player', pBlue.w.confettiCalls > 0);
    check('end-of-round: NO confetti for Green player', pGreen.w.confettiCalls === 0);
}

// ═════════ Timer fallback resiliency & synchronous countdown ═════════
{
    console.log('\n[timer fallback resiliency & synchronization]');
    const pHost = mkPlayer('TimerHost');
    pHost.val('create-name', 'TimerHost');
    pHost.val('create-teams', '2');
    pHost.doc.getElementById('create-teams').dispatchEvent(new pHost.w.Event('change'));
    pHost.val('create-team', 'red');
    pHost.val('create-timer', '60');
    pHost.click('create-btn');
    await sleep(150);

    const roomCode = pHost.st.code;
    const pGuest = mkPlayer('TimerGuest');
    pGuest.val('join-name', 'TimerGuest');
    pGuest.val('join-id', roomCode);
    pGuest.val('join-team', 'blue');
    pGuest.click('join-btn');
    await sleep(150);

    check('fallback-timer: initial timerStarted is false on both', pHost.st.timerStarted === false && pGuest.st.timerStarted === false);
    check('fallback-timer: timer badges visible and show 1:00', pHost.txt('turn-timer').includes('1:00') && pGuest.txt('turn-timer').includes('1:00'));

    // Simulate start_timer RPC failing on the database (e.g. PGRST202 schema missing start_timer)
    net.failRpc = { name: 'start_timer' };

    // Host clicks Start Timer button
    const hostStartBtn = pHost.doc.getElementById('start-timer-btn');
    hostStartBtn.click();
    await settle();

    // Clear simulated failure
    net.failRpc = null;

    // Verify host and guest both have timerStarted = true via the send_chat fallback
    check('fallback-timer: host timerStarted is true via fallback', pHost.st.timerStarted === true);
    check('fallback-timer: guest received timerStarted = true via chat fallback', pGuest.st.timerStarted === true);
    check('fallback-timer: start buttons hidden on both', pHost.doc.getElementById('start-timer-btn').classList.contains('hidden') && pGuest.doc.getElementById('start-timer-btn').classList.contains('hidden'));

    // Verify synchronous countdown: both host and guest tickTimer evaluate identically
    pHost.ev('tickTimer()');
    pGuest.ev('tickTimer()');
    const hostTimerTxt = pHost.txt('turn-timer');
    const guestTimerTxt = pGuest.txt('turn-timer');
    check('fallback-timer: timer countdown ticks synchronously on host and guest', hostTimerTxt === guestTimerTxt, `host=${hostTimerTxt}, guest=${guestTimerTxt}`);

    // Verify chat does NOT reset timerStarted or turnStartedAt
    const tHostBeforeChat = pHost.st.turnStartedAt;
    const tGuestBeforeChat = pGuest.st.turnStartedAt;
    pGuest.val('chat-text', 'Guest chat message');
    pGuest.click('submit-chat');
    await settle();

    check('fallback-timer: chat does not reset timerStarted on host or guest', pHost.st.timerStarted === true && pGuest.st.timerStarted === true);
    check('fallback-timer: chat does not reset turnStartedAt on host', pHost.st.turnStartedAt === tHostBeforeChat);
    check('fallback-timer: chat does not reset turnStartedAt on guest', pGuest.st.turnStartedAt === tGuestBeforeChat);

    // Verify card selection does NOT reset timer
    const curTeam = pHost.st.turn;
    const activePlayer = curTeam === pHost.st.myTeam ? pHost : pGuest;
    const otherPlayer = activePlayer === pHost ? pGuest : pHost;

    activePlayer.click('role-toggle-btn'); await sleep(80);
    activePlayer.val('hint-word', 'TESTING');
    activePlayer.val('hint-number', '2');
    activePlayer.click('submit-hint');
    await settle();

    activePlayer.click('role-toggle-btn'); await sleep(80);

    const tAfterHint = activePlayer.st.turnStartedAt;
    const ownCard = activePlayer.st.cards.map((c, i) => ({ ...c, i })).find((c) => c.team === curTeam && !c.revealed);
    await activePlayer.ev(`rpc('reveal_card', { p_code: '${roomCode}', p_team: '${curTeam}', p_index: ${ownCard.i} })`);
    await settle();

    check('fallback-timer: card reveal does not reset timerStarted', pHost.st.timerStarted === true && pGuest.st.timerStarted === true);
    check('fallback-timer: card reveal does not reset turnStartedAt', activePlayer.st.turnStartedAt === tAfterHint && otherPlayer.st.turnStartedAt === tAfterHint);
}

// ═════════ error log ═════════
console.log(`\nJS/console errors captured: ${errors.length}`);
errors.slice(0, 10).forEach((e) => console.log('  ', e));
console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail || errors.length ? 1 : 0);
