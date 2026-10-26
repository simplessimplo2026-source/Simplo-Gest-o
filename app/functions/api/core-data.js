import { loadAllRows } from '../../src/lib/tablePagination.js';
import { bearerToken, errorResponse, jsonResponse, requireMethod } from '../_lib/http.js';
import { supabaseRest, verifySupabaseUser } from '../_lib/supabase.js';

const coreTables = ['clientes', 'equipamentos', 'funcionarios', 'materiais', 'barreiros', 'orcamentos', 'fichas', 'ficha_servicos'];

export async function onRequest({ request, env }) {
  try {
    requireMethod(request, ['GET']);
    const accessToken = bearerToken(request);
    await verifySupabaseUser(env, accessToken);

    const results = await Promise.all(
      coreTables.map((table) => loadAllRows(({ offset, limit }) =>
        supabaseRest(env, accessToken, `${table}?order=id.asc&offset=${offset}&limit=${limit}`)))
    );

    return jsonResponse(200, {
      ok: true,
      data: Object.fromEntries(coreTables.map((table, index) => [table, results[index] || []])),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
