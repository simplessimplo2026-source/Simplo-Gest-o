import { firstValue, matchContractEquipment } from '../../lib/serviceLinks.js';
import { normalizeTextKey } from '../../lib/reports.js';
import { MATERIAL_UNIT_OPTIONS, materialUnitOptions } from '../../lib/units.js';

export function serviceTypeLabel(type) {
  if (type === 'diaria') return 'Diária';
  if (type === 'hora') return 'Hora';
  if (type === 'quantidade') return 'Quantidade';
  return 'Metragem';
}

function parseMoney(value) {
  if (value === '' || value === null || value === undefined) return 0;
  const raw = String(value).trim();
  if (!raw) return 0;
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function moneyBR(value) {
  return parseMoney(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function parseContracts(cliente) {
  if (!cliente?.contratos_servicos) return [];
  if (Array.isArray(cliente.contratos_servicos)) return cliente.contratos_servicos;
  try {
    const parsed = JSON.parse(cliente.contratos_servicos);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function timeToMinutes(value) {
  const [hours, minutes] = String(value || '').split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function rangeMinutes(start, end) {
  const ini = timeToMinutes(start);
  let fim = timeToMinutes(end);
  if (ini === null || fim === null) return 0;
  if (fim < ini) fim += 24 * 60;
  return Math.max(0, fim - ini);
}

export function serviceHourMinutes(service) {
  return rangeMinutes(service.hora_manha_ini, service.hora_manha_fim)
    + rangeMinutes(service.hora_tarde_ini, service.hora_tarde_fim);
}

function serviceChargeQuantity(service) {
  if (service.tipo === 'diaria') return service.diaria === 'meia' ? 0.5 : 1;
  if (service.tipo === 'hora') return Number((serviceHourMinutes(service) / 60).toFixed(2));
  const value = MATERIAL_UNIT_OPTIONS.map((unit) => service[unit.field]).find((entry) => String(entry || '').trim());
  return parseMoney(value || service.quantidade);
}

export function serviceChargeTotal(service) {
  const unitValue = parseMoney(service.valor_unitario);
  const quantity = serviceChargeQuantity(service);
  return String(service.valor_unitario ?? '').trim() !== '' && quantity !== null
    ? unitValue * quantity : parseMoney(firstValue(service.valor_total, service.valor));
}

export function equipmentDisplayValue(equipamento) {
  if (!equipamento?.nome) return '';
  const name = String(equipamento.nome || '').trim();
  const plate = String(equipamento.placa || '').trim();
  if (!plate) return name;
  return name.toLowerCase().includes(plate.toLowerCase()) ? name : `${name} - ${plate}`;
}

export function equipmentOptionLabel(equipamento) {
  const value = equipmentDisplayValue(equipamento);
  return [value, equipamento.operador ? `(${equipamento.operador})` : ''].filter(Boolean).join(' ');
}

const contractEquipmentMatch = matchContractEquipment;

function contractMaterialMatch(contract, materialName = '', unitId = '') {
  const items = Array.isArray(contract?.materiais) ? contract.materiais : [];
  const materialKey = normalizeTextKey(materialName);
  const unitKey = normalizeTextKey(unitId);
  if (!materialKey) return null;
  return items.find((item) => {
    const itemMaterialKey = normalizeTextKey(item.material_nome || item.nome);
    const itemUnitKey = normalizeTextKey(item.unidade || item.unit);
    return itemMaterialKey === materialKey && (!unitKey || !itemUnitKey || itemUnitKey === unitKey);
  }) || null;
}

function serviceMaterialUnitId(service, material) {
  const filledUnit = MATERIAL_UNIT_OPTIONS.find((unit) => String(service?.[unit.field] || '').trim());
  if (filledUnit) return filledUnit.id;
  return materialUnitOptions(material?.unidades, service?.tipo === 'quantidade' ? ['un'] : ['m3'])[0]?.id || '';
}

function contractValueForEquipment(contract, currentEquipment, tipo) {
  const match = contractEquipmentMatch(contract, currentEquipment);
  if (tipo === 'hora') return firstValue(match?.valor_hora, contract.valor_hora);
  if (tipo === 'diaria') return firstValue(match?.valor_diaria, contract.valor_diaria, contract.valor);
  return firstValue(match?.valor, contract.valor);
}

function contractValueForService(contract, currentEquipment, service = {}, material = null) {
  if (service.tipo === 'hora' || service.tipo === 'diaria') {
    return contractValueForEquipment(contract, currentEquipment, service.tipo);
  }
  const unitId = serviceMaterialUnitId(service, material);
  const match = contractMaterialMatch(contract, service.material, unitId);
  return firstValue(match?.valor, contract.valor);
}

export function contractEquipmentOptions(contracts, currentEquipment = {}, preferredType = '', service = {}, material = null) {
  const rows = [];

  function pushRow({ id, contract, tipo, valor, matched, sourceLabel = '' }) {
    if (valor === '' || valor === null || valor === undefined) return;
    rows.push({
      id,
      contract,
      tipo,
      valor,
      label: contract.obra || contract.nome || 'Obra',
      meta: `${serviceTypeLabel(tipo)} - ${moneyBR(valor)}${matched ? ` - ${sourceLabel || 'valor específico'}` : ''}`,
      matched: Boolean(matched),
    });
  }

  contracts.forEach((contract) => {
    const matchedEquipment = contractEquipmentMatch(contract, currentEquipment);
    const matchedMaterial = contractMaterialMatch(contract, service.material, serviceMaterialUnitId(service, material));
    pushRow({
      id: `${contract.id}:hora`,
      contract,
      tipo: 'hora',
      valor: contractValueForEquipment(contract, currentEquipment, 'hora'),
      matched: matchedEquipment?.valor_hora,
      sourceLabel: 'valor da máquina',
    });
    pushRow({
      id: `${contract.id}:diaria`,
      contract,
      tipo: 'diaria',
      valor: contractValueForEquipment(contract, currentEquipment, 'diaria'),
      matched: matchedEquipment?.valor_diaria,
      sourceLabel: 'valor da máquina',
    });
    if (service.material && service.tipo !== 'hora' && service.tipo !== 'diaria') {
      pushRow({
        id: `${contract.id}:material`,
        contract,
        tipo: service.tipo || 'quantidade',
        valor: contractValueForService(contract, currentEquipment, service, material),
        matched: matchedMaterial?.valor,
        sourceLabel: 'valor do material',
      });
    }
    pushRow({
      id: `${contract.id}:legacy`,
      contract,
      tipo: contract.tipo || 'diaria',
      valor: contract.valor ?? '',
    });
  });

  return rows.sort((a, b) => {
    const aType = a.tipo === preferredType ? 1 : 0;
    const bType = b.tipo === preferredType ? 1 : 0;
    return Number(b.matched) - Number(a.matched)
      || bType - aType
      || a.label.localeCompare(b.label);
  });
}

export function contractRootId(contractId) {
  return String(contractId || '').split(':')[0];
}

export function bestContractOption(contracts, currentEquipment, serviceType, preferredContractId = '') {
  const options = contractEquipmentOptions(contracts, currentEquipment, serviceType);
  const preferredRoot = contractRootId(preferredContractId);
  const sameWork = preferredRoot ? options.filter((option) => String(option.contract?.id) === preferredRoot) : options;
  const pool = preferredRoot ? sameWork : options;
  return pool.find((option) => option.tipo === serviceType)
    || pool[0]
    || null;
}

export function contractPatchFromOption(option, service) {
  if (!option) {
    return { contrato_id: '', contrato_nome: '', modelo_cobranca: '', valor_unitario: '', valor_total: '' };
  }
  const contract = option.contract;
  return {
    contrato_id: option.id,
    contrato_nome: contract.nome || contract.obra || '',
    endereco: contract.obra || service.endereco,
    modelo_cobranca: option.tipo || service.tipo,
    tipo: option.tipo || service.tipo,
    valor_unitario: option.valor ?? '',
    valor_total: '',
    valor: '',
  };
}

