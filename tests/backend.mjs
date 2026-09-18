// In-memory Postgres (PGlite) running the real sql/schema.sql, exposing the few calls script.js makes.
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';

const schema = new URL('../sql/schema.sql', import.meta.url);
const ser = (v) => (typeof v === 'object' && v !== null ? JSON.stringify(v) : v);
const fail = (e) => ({ data: null, error: { message: e.message, code: e.code } });

export async function createBackend() {
    const pg = new PGlite();
    await pg.exec('create role anon; create publication supabase_realtime;');
    await pg.exec(fs.readFileSync(schema, 'utf8'));
    return {
        pg,
        async insert(row) {
            const cols = Object.keys(row);
            try {
                const r = await pg.query(
                    `insert into games(${cols.join(',')}) values (${cols.map((_, i) => '$' + (i + 1)).join(',')}) returning *`,
                    cols.map((c) => ser(row[c])));
                return { data: r.rows[0], error: null };
            } catch (e) { return fail(e); }
        },
        async select(code) {
            try { return { data: (await pg.query('select * from games where game_code = $1', [code])).rows[0] || null, error: null }; }
            catch (e) { return fail(e); }
        },
        async rpc(name, args) {
            const keys = Object.keys(args);
            try {
                const r = await pg.query(`select * from ${name}(${keys.map((k, i) => `${k} => $${i + 1}`).join(',')})`, keys.map((k) => ser(args[k])));
                return { data: r.rows[0], error: null };
            } catch (e) { return fail(e); }
        }
    };
}
