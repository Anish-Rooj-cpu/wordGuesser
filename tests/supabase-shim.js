// Browser-side stand-in for supabase-js, talking to tests/dev-server.mjs. Served by the dev server only.
(() => {
    const post = (url, body) => fetch(url, { method: 'POST', body: JSON.stringify(body) })
        .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
        .catch((e) => ({ data: null, error: { message: 'Network error: ' + e.message } })); // like supabase-js: errors come back, not thrown
    const client = {
        from() {
            const q = {};
            q.insert = (row) => { q.row = row; return q; };
            q.select = () => q;
            q.eq = (c, v) => { q.code = v; return q; };
            const run = () => (q.row ? post('/api/insert', { row: q.row }) : post('/api/select', { code: q.code }));
            q.maybeSingle = run;
            q.single = async () => { const r = await run(); return r.error || r.data ? r : { data: null, error: { message: 'no rows' } }; };
            return q;
        },
        rpc: (name, args) => post('/api/rpc', { name, args }),
        channel(name, cfg) {
            const key = cfg?.config?.presence?.key || 'anon';
            const ch = {
                handlers: [], state: {}, es: null,
                on(type, opts, cb) { ch.handlers.push({ type, opts, cb }); return ch; },
                send(msg) {
                    if (msg?.type === 'broadcast') {
                        post('/api/broadcast', { room: name, event: msg.event, payload: msg.payload });
                    }
                },
                subscribe(cb) {
                    const fire = (type, arg) => ch.handlers
                        .filter((h) => h.type === type && (!h.opts?.event || h.opts.event === arg.event))
                        .forEach((h) => h.cb(arg));
                    ch.es = new EventSource(`/api/sse?room=${encodeURIComponent(name)}&key=${encodeURIComponent(key)}`);
                    ch.es.addEventListener('ready', () => cb('SUBSCRIBED'));
                    ch.es.addEventListener('update', (e) => fire('postgres_changes', { new: JSON.parse(e.data) }));
                    ch.es.addEventListener('presence', (e) => { ch.state = JSON.parse(e.data); fire('presence'); });
                    ch.es.addEventListener('broadcast', (e) => fire('broadcast', JSON.parse(e.data)));
                    ch.es.onerror = () => cb('CHANNEL_ERROR');
                    return ch;
                },
                track: (presence) => post('/api/track', { room: name, key, presence }),
                presenceState: () => ch.state
            };
            return ch;
        },
        removeChannel: async (ch) => { if (ch.es) ch.es.close(); }
    };
    window.supabase = { createClient: () => client };
})();
