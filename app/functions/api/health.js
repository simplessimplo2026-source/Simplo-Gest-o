import { errorResponse, jsonResponse, requireMethod } from '../_lib/http.js';
import { getSupabaseConfig } from '../_lib/supabase.js';

export async function onRequest({ request, env }) {
  try {
    requireMethod(request, ['GET']);
    const config = getSupabaseConfig(env);
    return jsonResponse(200, {
      ok: true,
      app: 'binhotti-gestao',
      layer: 'api',
      supabaseConfigured: Boolean(config.url && config.anonKey),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
