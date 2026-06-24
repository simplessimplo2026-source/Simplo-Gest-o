import { getServerEnv } from './_lib/env.js';
import { requireMethod, sendError, sendJson } from './_lib/http.js';

export default async function handler(req, res) {
  try {
    requireMethod(req, ['GET']);
    const env = getServerEnv();
    sendJson(res, 200, {
      ok: true,
      app: 'binhotti-gestao',
      layer: 'api',
      supabaseConfigured: Boolean(env.supabaseUrl && env.supabaseServiceRoleKey),
    });
  } catch (error) {
    sendError(res, error);
  }
}
