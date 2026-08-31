import { bearerToken, requireMethod, sendError, sendJson } from './_lib/http.js';
import { supabaseRest, verifySupabaseUser } from './_lib/supabaseServer.js';
import { loadAllRows } from '../src/lib/tablePagination.js';

const coreTables = ['clientes', 'equipamentos', 'funcionarios', 'materiais', 'barreiros', 'orcamentos', 'fichas', 'ficha_servicos'];

export default async function handler(req, res) {
  try {
    requireMethod(req, ['GET']);
    await verifySupabaseUser(bearerToken(req));

    const results = await Promise.all(
      coreTables.map((table) => loadAllRows(({ offset, limit }) =>
        supabaseRest(`${table}?order=id.asc&offset=${offset}&limit=${limit}`)))
    );

    sendJson(res, 200, {
      ok: true,
      data: Object.fromEntries(coreTables.map((table, index) => [table, results[index] || []])),
    });
  } catch (error) {
    sendError(res, error);
  }
}
