const REQUEST_TIMEOUT_MS = 20000;

export function getSupabaseConfig(env) {
  return {
    url: String(env.SUPABASE_URL || '').replace(/\/$/, ''),
    anonKey: env.SUPABASE_ANON_KEY || '',
  };
}

function requireSupabaseConfig(env) {
  const config = getSupabaseConfig(env);
  const missing = [];
  if (!config.url) missing.push('SUPABASE_URL');
  if (!config.anonKey) missing.push('SUPABASE_ANON_KEY');
  if (missing.length) {
    const error = new Error(`Variáveis de ambiente ausentes: ${missing.join(', ')}`);
    error.statusCode = 500;
    throw error;
  }
  return config;
}

async function supabaseFetch(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let body = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }
    if (!response.ok) {
      const error = new Error(body?.message || body?.error_description || body?.error || 'Erro ao acessar o Supabase.');
      error.statusCode = response.status;
      throw error;
    }
    return body;
  } catch (error) {
    if (error?.name === 'AbortError') {
      const timeoutError = new Error('Tempo de resposta do Supabase esgotado.');
      timeoutError.statusCode = 504;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function verifySupabaseUser(env, accessToken) {
  if (!accessToken) {
    const error = new Error('Sessão não informada.');
    error.statusCode = 401;
    throw error;
  }
  const { url, anonKey } = requireSupabaseConfig(env);
  return supabaseFetch(`${url}/auth/v1/user`, {
    method: 'GET',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });
}

// Use the authenticated user's JWT with the public project key. This keeps
// Postgres RLS in force instead of bypassing it with a service-role key.
export async function supabaseRest(env, accessToken, path) {
  const { url, anonKey } = requireSupabaseConfig(env);
  const cleanPath = String(path || '').replace(/^\/+/, '');
  return supabaseFetch(`${url}/rest/v1/${cleanPath}`, {
    method: 'GET',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });
}
