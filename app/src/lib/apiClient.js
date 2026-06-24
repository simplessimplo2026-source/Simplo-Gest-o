import { getCurrentSession } from './supabase.js';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const API_TIMEOUT_MS = 20000;

function apiUrl(path) {
  const normalizedPath = String(path || '').startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

async function parseResponse(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function errorMessage(body, status) {
  const message = body?.error || body?.message || body?.msg || body;
  if (message) return String(message);
  if (status === 401) return 'Sessao expirada. Entre novamente.';
  if (status === 403) return 'Voce nao tem permissao para esta acao.';
  return 'Nao foi possivel concluir a operacao.';
}

function networkErrorMessage(error) {
  if (error?.name === 'AbortError') return 'Tempo de resposta esgotado. Tente novamente.';
  return 'Nao foi possivel conectar com a API. Confira a internet e tente novamente.';
}

export function isApiModeEnabled() {
  return import.meta.env.VITE_USE_API === 'true';
}

export function apiModeLabel() {
  return isApiModeEnabled() ? 'API segura' : 'Base atual';
}

export async function apiFetch(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  const session = getCurrentSession();
  const isFormData = options.body instanceof FormData;
  const headers = {
    Accept: 'application/json',
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(apiUrl(path), {
      ...options,
      headers,
      signal: controller.signal,
      body: options.body && !isFormData && typeof options.body !== 'string'
        ? JSON.stringify(options.body)
        : options.body,
    });
    const body = await parseResponse(response);
    if (!response.ok) throw new Error(errorMessage(body, response.status));
    return body;
  } catch (error) {
    if (error?.name === 'AbortError' || error instanceof TypeError) {
      throw new Error(networkErrorMessage(error));
    }
    if (error?.message) throw error;
    throw new Error(networkErrorMessage(error));
  } finally {
    clearTimeout(timeout);
  }
}

export const api = {
  get: (path, options) => apiFetch(path, { ...options, method: 'GET' }),
  post: (path, body, options) => apiFetch(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => apiFetch(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => apiFetch(path, { ...options, method: 'DELETE' }),
};

export function apiHealth() {
  return api.get('/api/health');
}

export function apiMe() {
  return api.get('/api/auth/me');
}
