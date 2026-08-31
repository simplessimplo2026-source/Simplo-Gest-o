const PAGE_SIZE = 1000;

export async function loadAllRows(fetchPage) {
  const rows = [];
  while (true) {
    const page = await fetchPage({ offset: rows.length, limit: PAGE_SIZE });
    if (!Array.isArray(page)) throw new Error('Resposta inválida ao carregar registros.');
    // The server may enforce a smaller limit. Only an empty page confirms the end.
    if (page.length === 0) return rows;
    rows.push(...page);
  }
}
