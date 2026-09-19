// Local app server: static files + an in-memory Postgres/realtime stand-in for Supabase. No real project is touched.
// Run: npm run dev  (from tests/), then open http://127.0.0.1:8766/   (unit page: /test.html)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBackend } from './backend.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');
const PORT = Number(process.env.PORT) || 8766;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const be = await createBackend();
const rooms = new Map(); // room -> Set<{res, key, presence}>

let offline = false; // test switch: /_test/offline?on=1 kills every SSE stream and answers 503 until switched off
const emit = (c, ev, data) => { try { c.res.write(`event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`); } catch (e) { /* stream already gone */ } };
const clients = (room) => rooms.get(room) || new Set();
const presenceState = (room) => { const s = {}; clients(room).forEach((c) => { if (c.presence) s[c.key] = [c.presence]; }); return s; };
const broadcast = (room, ev, data) => clients(room).forEach((c) => emit(c, ev, data));
const readJson = (req) => new Promise((ok) => { let b = ''; req.on('data', (d) => (b += d)); req.on('end', () => ok(JSON.parse(b || '{}'))); });

http.createServer(async (req, res) => {
    const u = new URL(req.url, 'http://x');
    const json = (o) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };

    if (u.pathname === '/_test/offline') {
        offline = u.searchParams.get('on') === '1';
        if (offline) rooms.forEach((set) => set.forEach((c) => c.res.destroy()));
        return json({ offline });
    }
    if (u.pathname === '/_test/stats') return json(Object.fromEntries([...rooms].map(([room, set]) => [room, set.size])));
    if (offline && u.pathname.startsWith('/api/')) { res.writeHead(503); return res.end('offline'); }

    if (u.pathname === '/api/sse') {
        const room = u.searchParams.get('room');
        const c = { res, key: u.searchParams.get('key'), presence: null };
        res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' });
        rooms.set(room, clients(room).add(c));
        emit(c, 'ready', {});
        req.on('close', () => { clients(room).delete(c); broadcast(room, 'presence', presenceState(room)); });
        return;
    }
    if (req.method === 'POST' && u.pathname.startsWith('/api/')) {
        const b = await readJson(req);
        if (u.pathname === '/api/insert') return json(await be.insert(b.row));
        if (u.pathname === '/api/select') return json(await be.select(b.code));
        if (u.pathname === '/api/rpc') {
            const r = await be.rpc(b.name, b.args);
            if (r.data) broadcast(`room-${r.data.game_code}`, 'update', r.data);
            return json(r);
        }
        if (u.pathname === '/api/track') {
            clients(b.room).forEach((c) => { if (c.key === b.key) c.presence = b.presence; });
            broadcast(b.room, 'presence', presenceState(b.room));
            return json({});
        }
    }

    // static; index.html is rewritten in flight so the fake client replaces supabase-js (file on disk untouched)
    const rel = u.pathname === '/' ? 'index.html' : u.pathname.slice(1);
    const file = u.pathname === '/__shim.js' ? path.join(here, 'supabase-shim.js') : path.resolve(ROOT, rel);
    if (!file.startsWith(ROOT) && u.pathname !== '/__shim.js') { res.writeHead(404); return res.end('not found'); }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end('not found'); }
    let body = fs.readFileSync(file);
    if (rel === 'index.html') {
        body = body.toString().replace(/<script src="[^"]*supabase-js[^"]*"[^>]*><\/script>/, '<script src="/__shim.js"></script>');
    }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
}).listen(PORT, '127.0.0.1', () => console.log(`wordGuesser dev server: http://127.0.0.1:${PORT}/  (unit page: /test.html)`));
