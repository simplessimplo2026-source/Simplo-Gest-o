import { ShieldCheck } from 'lucide-react';
import { apiModeLabel, isApiModeEnabled } from '../lib/apiClient.js';

export function RuntimeBadge() {
  const apiMode = isApiModeEnabled();
  return (
    <span className={`runtime-badge ${apiMode ? 'is-api' : 'is-current'}`} title={apiMode ? 'Rotas server-side ativas' : 'App em transicao para API server-side'}>
      <ShieldCheck size={13} />
      <span>{apiModeLabel()}</span>
    </span>
  );
}
