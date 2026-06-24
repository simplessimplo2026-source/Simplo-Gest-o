import { assertServerEnv } from './env.js';

const REQUEST_TIMEOUT_MS = 20000;

async function serverFetch(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    const body = text ? tryParseJson(text) : null;
    if (!response.ok) {
      const error = new Error(body?.message || body?.error_description || body?.error || 'Erro ao acessar Supabase.');
      error.statusCode = response.status;
      error.details = body;
      throw error;
    }
    return body;
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error('Tempo de resposta do Supabase esgotado.');
      timeoutError.statusCode = 504;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function serverHeaders({ bearer, prefer } = {}) {
  const { supabaseServiceRoleKey } = assertServerEnv();
  return {
    apikey: supabaseServiceRoleKey,
    Authorization: bearer ? `Bearer ${bearer}` : `Bearer ${supabaseServiceRoleKey}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

export async function verifySupabaseUser(accessToken) {
  if (!accessToken) {
    const error = new Error('Sessao nao informada.');
    error.statusCode = 401;
    throw error;
  }
  const { supabaseUrl } = assertServerEnv();
  return serverFetch(`${supabaseUrl}/auth/v1/user`, {
    method: 'GET',
    headers: serverHeaders({ bearer: accessToken }),
  });
}

export async function supabaseRest(path, options = {}) {
  const { supabaseUrl } = assertServerEnv();
  const cleanPath = String(path || '').replace(/^\/+/, '');
  return serverFetch(`${supabaseUrl}/rest/v1/${cleanPath}`, {
    ...options,
    headers: {
      ...serverHeaders({ prefer: options.prefer }),
      ...(options.headers || {}),
    },
  });
}
