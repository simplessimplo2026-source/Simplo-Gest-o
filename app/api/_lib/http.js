export function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export function sendError(res, error) {
  const statusCode = Number(error?.statusCode || error?.status || 500);
  const safeStatus = statusCode >= 400 && statusCode < 600 ? statusCode : 500;
  sendJson(res, safeStatus, {
    ok: false,
    error: safeStatus >= 500 ? 'Erro interno do servidor.' : error.message,
  });
}

export function requireMethod(req, allowedMethods) {
  if (allowedMethods.includes(req.method)) return;
  const error = new Error('Metodo nao permitido.');
  error.statusCode = 405;
  throw error;
}

export async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error('JSON invalido.');
    error.statusCode = 400;
    throw error;
  }
}

export function bearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || '';
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match?.[1] || '';
}
