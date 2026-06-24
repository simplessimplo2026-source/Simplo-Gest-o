import { bearerToken, requireMethod, sendError, sendJson } from '../_lib/http.js';
import { verifySupabaseUser } from '../_lib/supabaseServer.js';

export default async function handler(req, res) {
  try {
    requireMethod(req, ['GET']);
    const user = await verifySupabaseUser(bearerToken(req));
    sendJson(res, 200, {
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        aud: user.aud,
      },
    });
  } catch (error) {
    sendError(res, error);
  }
}
