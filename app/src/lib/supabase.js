const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://sxvjocfxsasxfobyvqqr.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const SESSION_KEY = 'binhotti-react-session';

const coreTables = ['clientes', 'equipamentos', 'funcionarios', 'materiais', 'barreiros', 'orcamentos', 'fichas', 'ficha_servicos'];

let currentSession = null;

function saveSession(session) {
  currentSession = session;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  currentSession = null;
  localStorage.removeItem(SESSION_KEY);
}

function authHeaders(prefer) {
  const token = currentSession?.access_token;
  return {
    apikey: SUPABASE_KEY,
    Authorization: token ? `Bearer ${token}` : `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

async function parseBody(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function errorMessage(body) {
  return String(body?.message || body?.msg || body?.error_description || body || 'Erro ao acessar o Supabase.');
}

function isExpiredAuth(response, message) {
  return response.status === 401 || /jwt expired|invalid jwt|expired/i.test(message);
}

function tableUrl(table, query = '') {
  const suffix = query ? `&${query.replace(/^\?/, '')}` : '';
  return `${SUPABASE_URL}/rest/v1/${table}?order=id.asc${suffix}`;
}

function filteredUrl(table, query = '') {
  const suffix = query ? `?${query.replace(/^\?/, '')}` : '';
  return `${SUPABASE_URL}/rest/v1/${table}${suffix}`;
}

async function refreshSession() {
  if (!currentSession?.refresh_token) throw new Error('Sessão expirada. Entre novamente.');
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ refresh_token: currentSession.refresh_token }),
  });
  const body = await parseBody(response);
  if (!response.ok) {
    clearSession();
    throw new Error('Sessão expirada. Entre novamente.');
  }
  saveSession(body);
  return body;
}

async function requestJson(url, options = {}, retry = true) {
  const response = await fetch(url, options);
  const body = await parseBody(response);
  if (response.ok) return body;

  const message = errorMessage(body);
  if (retry && isExpiredAuth(response, message)) {
    const prefer = options.headers?.Prefer;
    await refreshSession();
    return requestJson(url, { ...options, headers: authHeaders(prefer) }, false);
  }

  throw new Error(message);
}

export function restoreSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    currentSession = raw ? JSON.parse(raw) : null;
    return currentSession;
  } catch {
    clearSession();
    return null;
  }
}

export async function loginWithPassword(email, password) {
  const body = await requestJson(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  saveSession(body);
  return body;
}

export async function logout() {
  try {
    if (currentSession?.access_token) {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${currentSession.access_token}` },
      });
    }
  } finally {
    clearSession();
  }
}

export async function getTable(table, query = '') {
  return requestJson(tableUrl(table, query), { headers: authHeaders() });
}

export async function insertRow(table, data) {
  const rows = await requestJson(filteredUrl(table), {
    method: 'POST',
    headers: authHeaders('return=representation'),
    body: JSON.stringify(data),
  });
  return Array.isArray(rows) ? rows[0] : rows;
}

export async function updateRow(table, id, data) {
  const rows = await requestJson(filteredUrl(table, `id=eq.${encodeURIComponent(id)}`), {
    method: 'PATCH',
    headers: authHeaders('return=representation'),
    body: JSON.stringify(data),
  });
  return Array.isArray(rows) ? rows[0] : rows;
}

export async function deleteRow(table, id) {
  await requestJson(filteredUrl(table, `id=eq.${encodeURIComponent(id)}`), {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return true;
}

export async function deleteRows(table, query) {
  await requestJson(filteredUrl(table, query), {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return true;
}

export async function loadCoreData() {
  const results = await Promise.all(coreTables.map((table) => getTable(table)));
  return Object.fromEntries(coreTables.map((table, index) => [table, results[index] || []]));
}

export async function loadFichaServicos(fichaId) {
  if (!fichaId) return [];
  return getTable('ficha_servicos', `ficha_id=eq.${encodeURIComponent(fichaId)}`);
}
