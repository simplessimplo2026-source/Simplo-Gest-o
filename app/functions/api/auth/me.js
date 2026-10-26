import { bearerToken, errorResponse, jsonResponse, requireMethod } from '../../_lib/http.js';
import { verifySupabaseUser } from '../../_lib/supabase.js';

export async function onRequest({ request, env }) {
  try {
    requireMethod(request, ['GET']);
    const user = await verifySupabaseUser(env, bearerToken(request));
    return jsonResponse(200, {
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        aud: user.aud,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
