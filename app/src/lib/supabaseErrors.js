function rawErrorMessage(body) {
  return String(body?.message || body?.msg || body?.error_description || body || 'Erro ao acessar o Supabase.');
}

export function supabaseErrorMessage(body) {
  const message = rawErrorMessage(body);
  if (/no api key found in request|no `?apikey`? request header|no apikey request header/i.test(message)) {
    return 'A configuração do Supabase está incompleta: a chave apikey não foi enviada. Verifique as variáveis do deploy.';
  }
  if (/invalid login credentials/i.test(message)) return 'E-mail ou senha inválidos.';
  if (/email not confirmed/i.test(message)) return 'E-mail ainda não confirmado.';
  if (/jwt expired|invalid jwt|token has expired/i.test(message)) return 'Sessão expirada. Entre novamente.';
  return message;
}

export function isExpiredAuth(response, body) {
  if (response.status !== 401) return false;
  return /jwt expired|invalid jwt|token has expired/i.test(rawErrorMessage(body));
}
