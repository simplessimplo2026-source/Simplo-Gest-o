export function getServerEnv() {
  return {
    supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
  };
}

export function assertServerEnv() {
  const env = getServerEnv();
  const missing = [];
  if (!env.supabaseUrl) missing.push('SUPABASE_URL');
  if (!env.supabaseAnonKey) missing.push('SUPABASE_ANON_KEY');
  if (missing.length) {
    const error = new Error(`Variaveis de servidor ausentes: ${missing.join(', ')}`);
    error.statusCode = 500;
    throw error;
  }
  return env;
}
