export function getServerEnv() {
  return {
    supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  };
}

export function assertServerEnv() {
  const env = getServerEnv();
  const missing = [];
  if (!env.supabaseUrl) missing.push('SUPABASE_URL');
  if (!env.supabaseServiceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (missing.length) {
    const error = new Error(`Variaveis de servidor ausentes: ${missing.join(', ')}`);
    error.statusCode = 500;
    throw error;
  }
  return env;
}
