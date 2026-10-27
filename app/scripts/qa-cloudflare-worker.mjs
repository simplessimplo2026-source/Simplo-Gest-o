import assert from 'node:assert/strict';
import worker from '../src/cloudflare-worker.js';

const env = {
  SUPABASE_URL: 'https://test-project.supabase.co',
  SUPABASE_ANON_KEY: 'test-public-key',
  ASSETS: {
    fetch: async (request) => new Response(`asset:${new URL(request.url).pathname}`),
  },
};

const health = await worker.fetch(new Request('https://preview.example/api/health'), env, { waitUntil() {} });
assert.equal(health.status, 200);
assert.equal((await health.json()).supabaseConfigured, true);

const unknownApi = await worker.fetch(new Request('https://preview.example/api/not-found'), env, { waitUntil() {} });
assert.equal(unknownApi.status, 404);

const asset = await worker.fetch(new Request('https://preview.example/dashboard'), env, { waitUntil() {} });
assert.equal(await asset.text(), 'asset:/dashboard');

process.stdout.write('Cloudflare Worker routing QA passed.\n');
