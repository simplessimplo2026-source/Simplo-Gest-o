import { callRpc } from '../../lib/supabase.js';
import { hasServiceContent, servicePayload } from './fichaHelpers.js';

export function buildAtomicFichaRequest({ requestId, fichaId, isNew, expectedRevision, ficha, services, originalServiceIds, data }) {
  const servicos = (services || [])
    .filter(hasServiceContent)
    .map((service) => ({
      id: service.id || service.localId,
      ...servicePayload(service, fichaId, data),
    }));

  return {
    request_id: requestId,
    ficha_id: fichaId,
    is_new: Boolean(isNew),
    expected_revision: Number(expectedRevision || 0),
    ficha,
    servicos,
    original_service_ids: originalServiceIds || [],
  };
}

export async function saveFichaAtomic(input) {
  const result = await callRpc('save_ficha_atomic', {
    p_request: buildAtomicFichaRequest(input),
  });
  if (!result?.ficha?.id) throw new Error('O banco não confirmou a ficha e seus serviços. Tente novamente.');
  return result;
}
