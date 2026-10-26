export function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export function errorResponse(error) {
  const status = Number(error?.statusCode || error?.status || 500);
  const safeStatus = status >= 400 && status < 600 ? status : 500;
  return jsonResponse(safeStatus, {
    ok: false,
    error: safeStatus >= 500 ? 'Erro interno do servidor.' : error.message,
  });
}

export function requireMethod(request, allowedMethods) {
  if (allowedMethods.includes(request.method)) return;
  const error = new Error('Método não permitido.');
  error.statusCode = 405;
  throw error;
}

export function bearerToken(request) {
  const match = String(request.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
  return match?.[1] || '';
}
