import { onRequest as health } from '../functions/api/health.js';
import { onRequest as authMe } from '../functions/api/auth/me.js';
import { onRequest as coreData } from '../functions/api/core-data.js';

const apiRoutes = new Map([
  ['/api/health', health],
  ['/api/auth/me', authMe],
  ['/api/core-data', coreData],
]);

function jsonError(status, error) {
  return Response.json({ ok: false, error }, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export default {
  async fetch(request, env, context) {
    const { pathname } = new URL(request.url);
    if (!pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
    }

    const handler = apiRoutes.get(pathname);
    if (!handler) return jsonError(404, 'Rota não encontrada.');

    try {
      return await handler({
        request,
        env,
        params: {},
        waitUntil: (promise) => context.waitUntil(promise),
        next: () => env.ASSETS.fetch(request),
      });
    } catch {
      return jsonError(500, 'Erro interno do servidor.');
    }
  },
};
