import { normalizeTextKey } from './reports.js';

export const hasValue = (value) => value !== null && value !== undefined && String(value).trim() !== '';
export const firstValue = (...values) => values.find(hasValue) ?? '';

export function matchContractEquipment(contract, equipment = {}) {
  if (!equipment) return null;
  const items = Array.isArray(contract?.equipamentos) ? contract.equipamentos : [];
  if (hasValue(equipment.id)) {
    const matches = items.filter((item) => String(item.equipamento_id) === String(equipment.id));
    if (matches.length) return matches.length === 1 ? matches[0] : null;
  }
  const compatible = items.filter((item) => !hasValue(equipment.id) || !hasValue(item.equipamento_id));
  const plate = normalizeTextKey(equipment.placa);
  if (plate) {
    const matches = compatible.filter((item) => normalizeTextKey(item.equipamento_placa) === plate);
    if (matches.length) return matches.length === 1 ? matches[0] : null;
  }
  const name = normalizeTextKey(equipment.nome);
  const matches = compatible.filter((item) => !hasValue(item.equipamento_placa)
    && name && normalizeTextKey(item.equipamento_nome) === name);
  return matches.length === 1 ? matches[0] : null;
}

export function resolveServiceClient(service, clientes = []) {
  const id = firstValue(service.cli_id, service.cliente_id);
  if (hasValue(id)) return clientes.find((item) => String(item.id) === String(id)) || null;
  const name = normalizeTextKey(service.cliente || service.cliente_nome);
  const matches = clientes.filter((item) => name && [item.nome, item.fantasia].some((value) => normalizeTextKey(value) === name));
  return matches.length === 1 ? matches[0] : null;
}

export function resolveServiceContract(service, cliente) {
  let contracts = cliente?.contratos_servicos || [];
  if (!Array.isArray(contracts)) {
    try { contracts = JSON.parse(contracts); } catch { return null; }
  }
  if (!Array.isArray(contracts)) return null;
  const root = String(service.contrato_id || '').split(':')[0];
  if (root) return contracts.find((item) => String(item.id) === root) || null;
  const names = [service.contrato_nome, service.endereco, service.obra, service.local].map(normalizeTextKey).filter(Boolean);
  const matches = contracts.filter((item) => [item.nome, item.obra].some((name) => names.includes(normalizeTextKey(name))));
  return matches.length === 1 ? matches[0] : null;
}
