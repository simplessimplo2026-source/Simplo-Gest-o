import { api, isApiModeEnabled } from './apiClient.js';
import { loadCoreData as loadCoreDataFromSupabase } from './supabase.js';

export async function loadAppData() {
  if (!isApiModeEnabled()) return loadCoreDataFromSupabase();
  const response = await api.get('/api/core-data');
  return response?.data || {};
}
