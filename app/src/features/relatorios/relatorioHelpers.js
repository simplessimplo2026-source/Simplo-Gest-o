export function reportNumber(value) {
  const parsed = Number(String(value || 0).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function reportMoney(value) {
  return reportNumber(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function reportQuantity(value) {
  return reportNumber(value).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
}

export function buildReportTotalRow(headers, totals) {
  const row = Array.from({ length: headers.length }, () => '');
  row[0] = 'TOTAL DO RELATÓRIO';

  const quantityIndex = headers.indexOf('Quantidade');
  const servicesIndex = headers.findIndex((header) => String(header).toLowerCase().startsWith('servi'));
  const valueIndex = headers.lastIndexOf('Valor');

  if (quantityIndex >= 0) row[quantityIndex] = totals.qtdLabel || reportQuantity(totals.qtd);
  else if (servicesIndex >= 0) row[servicesIndex] = reportQuantity(totals.servicos);

  if (valueIndex >= 0) row[valueIndex] = reportMoney(totals.valor);
  return row;
}
