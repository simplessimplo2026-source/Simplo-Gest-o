import assert from 'node:assert/strict';
import { onRequest as health } from '../functions/api/health.js';
import { onRequest as authMe } from '../functions/api/auth/me.js';
import { onRequest as coreData } from '../functions/api/core-data.js';

const env = {
  SUPABASE_URL: 'https://test-project.supabase.co',
  SUPABASE_ANON_KEY: 'test-public-key',
};

function request(path, { method = 'GET', token } = {}) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  return new Request(`https://binhotti-test.pages.dev${path}`, { method, headers });
}

async function responseJson(response) {
  return response.json();
}

const originalFetch = globalThis.fetch;

try {
  const healthResponse = await health({ request: request('/api/health'), env });
  assert.equal(healthResponse.status, 200);
  assert.equal((await responseJson(healthResponse)).supabaseConfigured, true);

  const methodResponse = await health({ request: request('/api/health', { method: 'POST' }), env });
  assert.equal(methodResponse.status, 405);

  const noTokenResponse = await authMe({ request: request('/api/auth/me'), env });
  assert.equal(noTokenResponse.status, 401);

  const requests = [];
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    const headers = new Headers(init.headers);
    requests.push({ url, apikey: headers.get('apikey'), authorization: headers.get('authorization') });
    if (url.endsWith('/auth/v1/user')) {
      return Response.json({ id: 'user-qa', email: 'qa@example.test', role: 'authenticated', aud: 'authenticated' });
    }
    if (url.includes('/rest/v1/')) {
      const table = new URL(url).pathname.split('/').at(-1);
      const offset = Number(new URL(url).searchParams.get('offset'));
      return Response.json(table === 'fichas' && offset === 0 ? [{ id: 'ficha-qa' }] : []);
    }
    throw new Error('Unexpected QA request URL');
  };

  const authResponse = await authMe({ request: request('/api/auth/me', { token: 'user-token-qa' }), env });
  assert.equal(authResponse.status, 200);
  assert.equal((await responseJson(authResponse)).user.id, 'user-qa');

  const dataResponse = await coreData({ request: request('/api/core-data', { token: 'user-token-qa' }), env });
  assert.equal(dataResponse.status, 200);
  const payload = await responseJson(dataResponse);
  assert.deepEqual(payload.data.fichas, [{ id: 'ficha-qa' }]);
  assert.deepEqual(Object.keys(payload.data).sort(), [
    'barreiros', 'clientes', 'equipamentos', 'ficha_servicos', 'fichas', 'funcionarios', 'materiais', 'orcamentos',
  ]);
  assert.ok(requests.length >= 10, 'A API deve validar o usuário e carregar as tabelas, incluindo a página final vazia.');
  assert.ok(requests.every((call) => call.apikey === env.SUPABASE_ANON_KEY), 'Toda chamada precisa enviar a chave pública do projeto.');
  assert.ok(requests.every((call) => call.authorization === 'Bearer user-token-qa'), 'Toda consulta de dados deve preservar o JWT do usuário para aplicar RLS.');

  process.stdout.write('Cloudflare Pages Functions QA passou.\n');
} finally {
  globalThis.fetch = originalFetch;
}
