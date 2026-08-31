import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import handler from '../api/core-data.js';

// Substitute only Vite's build-time configuration; all requests use a fake server.
const source = (await readFile(new URL('../src/lib/supabase.js', import.meta.url), 'utf8'))
  .replaceAll('import.meta.env', JSON.stringify({ VITE_SUPABASE_URL: 'https://pagination.test', VITE_SUPABASE_ANON_KEY: 'test' }))
  .replaceAll("'./tablePagination.js'", JSON.stringify(new URL('../src/lib/tablePagination.js', import.meta.url).href));
const client = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };
const tables = {
  fichas: Array.from({ length: 1005 }, (_, i) => ({ id: i + 1, codigo: `F-${i + 1}` })),
  // A service can appear in the report even when its parent is beyond the first page.
  ficha_servicos: [{ id: 1, ficha_id: 1005 }],
};
let serverCap = 1000;
let failOffset = null;
const calls = [];

globalThis.fetch = async (input) => {
  const url = new URL(input);
  if (url.pathname === '/auth/v1/user') return new Response(JSON.stringify({ id: 'qa-user' }));
  const table = url.pathname.split('/').at(-1);
  assert.equal(url.searchParams.get('order'), 'id.asc');
  const offset = Number(url.searchParams.get('offset') || 0);
  calls.push({ table, offset });
  if (table === 'fichas' && offset === failOffset) {
    return new Response(JSON.stringify({ message: 'Falha de pagina QA' }), { status: 503 });
  }
  const filter = url.searchParams.get('ficha_id');
  const rows = (tables[table] || []).filter((row) => !filter || `eq.${row.ficha_id}` === filter);
  const limit = Math.min(serverCap, Number(url.searchParams.get('limit') || serverCap));
  return new Response(JSON.stringify(rows.slice(offset, offset + limit)));
};

async function loadApi() {
  let response;
  const res = { setHeader() {}, end(body) { response = { status: this.statusCode, ...JSON.parse(body) }; } };
  await handler({ method: 'GET', headers: { authorization: 'Bearer qa' } }, res);
  return response;
}

try {
  process.env.SUPABASE_URL = 'https://pagination.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test';
  for (const cap of [1000, 200]) {
    serverCap = cap;
    for (const load of [() => client.loadCoreData(), async () => {
      const response = await loadApi();
      assert.equal(response.status, 200);
      return response.data;
    }]) {
      const data = await load();
      assert.equal(data.fichas.length, 1005, 'Fichas beyond the server cap must remain visible');
      assert.equal(new Set(data.fichas.map((row) => row.id)).size, 1005);
      assert.ok(data.fichas.some((row) => row.id === data.ficha_servicos[0].ficha_id));
      assert.deepEqual(data.clientes, []);
    }
  }

  tables.ficha_servicos = Array.from({ length: 400 }, (_, i) => ({ id: i + 1, ficha_id: 1005 }));
  tables.ficha_servicos.push({ id: 401, ficha_id: 7 });
  const services = await client.loadFichaServicos(1005);
  assert.equal(services.length, 400, 'Load every linked service, including exact page multiples');
  assert.ok(services.every((row) => row.ficha_id === 1005));
  assert.equal(new Set(services.map((row) => row.id)).size, 400);
  assert.deepEqual(await client.loadFichaServicos(null), []);

  failOffset = 200;
  await assert.rejects(client.loadCoreData(), /Falha de pagina QA/);
  assert.equal((await loadApi()).status, 503, 'Do not return a partial dataset as success');
  assert.ok(calls.some((call) => call.table === 'fichas' && call.offset === 1000));
  console.log('Pagination QA passed: client, API, server caps, linked services and page errors.');
} finally {
  globalThis.fetch = originalFetch;
  for (const key of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
}
