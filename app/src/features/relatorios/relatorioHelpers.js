import { equipmentForFicha, isMissingMachineValue, normalizeTextKey } from '../../lib/reports.js';

export function machineOptionLabel(equipment) {
  const name = String(equipment?.nome || '').trim();
  const plate = String(equipment?.placa || '').trim();
  if (plate && normalizeTextKey(name).includes(normalizeTextKey(plate))) return name;
  return [name, plate].filter(Boolean).join(' - ');
}

export function reportMachineOptions(data) {
  const options = new Map();
  for (const equipment of data?.equipamentos || []) {
    const label = machineOptionLabel(equipment);
    const value = equipment.id != null ? `eq:${equipment.id}` : label;
    if (label) options.set(value, { value, label });
  }
  for (const ficha of data?.fichas || []) {
    if (isMissingMachineValue(ficha.maquina) || equipmentForFicha(ficha, data)) continue;
    const key = normalizeTextKey(ficha.maquina);
    if (!options.has(key)) options.set(key, { value: ficha.maquina, label: ficha.maquina });
  }
  return [...options.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export function machineFilterMatches(row, selectedMachine) {
  if (!selectedMachine) return true;
  const selected = String(selectedMachine);
  if (selected.startsWith('eq:')) return String(row.equipamento_id ?? '') === selected.slice(3);
  const key = normalizeTextKey(selected);
  if (!key) return false;
  return [row.maquina, row.placa, machineOptionLabel({ nome: row.maquina, placa: row.placa })]
    .some((value) => normalizeTextKey(value) === key);
}

export function reportMachineGroupKey(row) {
  return row.equipamento_id ? `eq:${row.equipamento_id}`
    : normalizeTextKey(machineOptionLabel({ nome: row.maquina, placa: row.placa })) || 'sem-maquina';
}

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
