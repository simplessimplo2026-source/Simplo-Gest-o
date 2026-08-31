// Keep existing IDs and defer explicit removals until every remaining service
// has been written. This is not a database transaction: errors retain progress
// so a retry in the open modal does not insert acknowledged services twice.
export async function persistServices(services, originalIds, { save, remove }) {
  const next = services.map((service) => ({ ...service }));
  try {
    for (const service of next) {
      const row = await save(service);
      if (!row?.id) throw new Error('O banco não confirmou o serviço salvo. Reabra a ficha antes de tentar novamente.');
      service.id = row.id;
    }
    const kept = new Set(next.map((service) => String(service.id)));
    for (const id of originalIds) if (!kept.has(String(id))) await remove(id);
    return next;
  } catch (error) {
    error.services = next;
    throw error;
  }
}
