import { firstValue, hasValue, matchContractEquipment, resolveServiceClient, resolveServiceContract } from '../../lib/serviceLinks.js';
import { dateBR, equipmentForFicha as resolveEquipmentForFicha, machineForFicha } from '../../lib/reports.js';
import { MATERIAL_UNIT_OPTIONS } from '../../lib/units.js';
import { num, money, qtd, displayUnit, hasValue as hasValueUtil } from './reportConstants.js';
import { machineFilterMatches } from './relatorioHelpers.js';

function serviceQuantity(service) {
  if (service.tipo === 'diaria') return service.diaria === 'meia' ? 0.5 : 1;
  return num(service.quantidade);
}

function serviceUnit(service) {
  if (service.tipo === 'diaria') return 'diária';
  if (service.tipo === 'metragem') return 'm³';
  if (service.tipo === 'hora') return 'Hora';
  return 'un';
}

function serviceMeasures(service) {
  if (service.tipo === 'diaria' || service.tipo === 'hora') {
    return [{ quantidade: serviceQuantity(service), unidade: serviceUnit(service), label: '' }];
  }
  const entries = MATERIAL_UNIT_OPTIONS
    .map((unit) => ({ quantidade: num(service[unit.field]), unidade: unit.report, label: unit.label }))
    .filter((entry) => entry.quantidade);
  if (entries.length) return entries;
  return [{ quantidade: serviceQuantity(service), unidade: serviceUnit(service), label: '' }];
}

function serviceDescription(service, machineName) {
  let description = '';
  if (service.tipo === 'diaria') {
    description = service.diaria === 'meia' ? 'Meia diária' : 'Diária';
  }
  else if (service.tipo === 'hora') {
    const ranges = [
      service.hora_manha_ini && service.hora_manha_fim ? `${service.hora_manha_ini}-${service.hora_manha_fim}` : '',
      service.hora_tarde_ini && service.hora_tarde_fim ? `${service.hora_tarde_ini}-${service.hora_tarde_fim}` : '',
    ].filter(Boolean).join(' / ');
    description = ranges ? `Serviço por hora - ${ranges}` : 'Serviço por hora';
  }
  else if (service.material) description = service.material;
  else if (service.tipo === 'metragem') description = 'Serviço de terraplenagem';
  else if (service.tipo === 'quantidade') description = 'Serviço por quantidade';
  else description = service.tipo || 'Serviço';

  if (service.barreiro && !description.includes(service.barreiro)) description += ` - Barreiro: ${service.barreiro}`;
  if (machineName && machineName !== '-' && !description.includes(machineName)) description += ` - Equipamento: ${machineName}`;
  return description;
}

function clientFromService(service, clientes) {
  if (service.cli_id) {
    const cliente = clientes.find((item) => String(item.id) === String(service.cli_id));
    if (cliente) return cliente.fantasia || cliente.nome || service.cliente || 'Sem cliente';
  }
  return service.cliente || 'Sem cliente';
}

const clientObjectFromService = resolveServiceClient;

function contractValueForType(contract, type) {
  if (!contract) return '';
  if (type === 'hora') return contract.valor_hora;
  if (type === 'diaria') return firstValue(contract.valor_diaria, contract.valor);
  return contract.valor;
}

function contractEquipmentValue(contract, equipamento, type) {
  const match = matchContractEquipment(contract, equipamento);
  if (!match) return '';
  if (type === 'hora') return match.valor_hora;
  if (type === 'diaria') return match.valor_diaria;
  return match.valor;
}

const linkedContractForService = resolveServiceContract;

function displayChargeType(type) {
  const value = String(type || '').toLowerCase().trim();
  if (value === 'diaria') return 'Diaria';
  if (value === 'hora') return 'Hora';
  if (value === 'metragem') return 'Metragem';
  if (value === 'quantidade') return 'Quantidade';
  return value || '-';
}

function reportDateKey(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const br = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(raw);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;

  return '';
}

export function buildRows(data, filters) {
  const fichas = data?.fichas || [];
  const servicos = data?.ficha_servicos || [];
  const clientes = data?.clientes || [];

  return servicos.flatMap((service) => {
    const ficha = fichas.find((item) => String(item.id) === String(service.ficha_id)) || {};
    const clienteObj = clientObjectFromService(service, clientes);
    const cliente = clienteObj
      ? (clienteObj.fantasia || clienteObj.nome || service.cliente || 'Sem cliente')
      : clientFromService(service, clientes);
    const linkedContract = linkedContractForService(service, clienteObj);
    const obra = linkedContract?.obra || linkedContract?.nome || service.contrato_nome || service.endereco || service.obra || service.local || cliente || 'Sem obra';
    const equipamento = resolveEquipmentForFicha(ficha, data);
    const maquina = equipamento?.nome || machineForFicha(ficha, data) || service.maquina || '';
    const placa = equipamento?.placa || '';
    return serviceMeasures(service).map((measure) => {
      const linkedUnitValue = firstValue(contractEquipmentValue(linkedContract, equipamento, service.tipo), contractValueForType(linkedContract, service.tipo));
      const storedUnitValue = num(service.valor_unitario);
      const valorUnitario = hasValue(service.valor_unitario) ? storedUnitValue : num(linkedUnitValue);
      const savedTotal = firstValue(service.valor_total, service.valor);
      const storedTotal = num(savedTotal);
      const valorTotal = hasValue(savedTotal) ? storedTotal : valorUnitario * num(measure.quantidade);
      const row = {
      data: ficha.data || service.data || '',
      ficha_id: service.ficha_id,
      codigo: String(ficha.codigo || '').trim(),
      pedido: [service.nota_pedido, service.pedido_numero, service.n_pedido]
        .map((value) => String(value ?? '').trim()).find(Boolean) || '',
      cliente,
      cli_id: firstValue(service.cli_id, service.cliente_id, clienteObj?.id),
      obra,
      equipamento_id: equipamento?.id || '',
      maquina,
      placa,
      operador: ficha.operador || service.operador || '',
      tipo: service.tipo || '',
      material: service.material || '',
      barreiro: service.barreiro || '',
      descricao: serviceDescription(service, maquina),
      cobranca: displayChargeType(service.tipo),
      unidade: displayUnit(measure.unidade),
      quantidade: measure.quantidade,
      valor_unitario: valorUnitario,
      valor: valorTotal,
      };
      row.texto = [row.codigo, row.pedido, row.cliente, row.obra, row.maquina, row.placa, row.operador, row.tipo, row.cobranca, row.material, row.barreiro, row.descricao, row.unidade]
        .join(' ')
        .toLowerCase();
      return row;
    });
  }).filter((row) => {
    const rowDate = reportDateKey(row.data);
    const startDate = reportDateKey(filters.ini);
    const endDate = reportDateKey(filters.fim);
    if (startDate && rowDate && rowDate < startDate) return false;
    if (endDate && rowDate && rowDate > endDate) return false;
    if (filters.cliente && String(row.cli_id) !== String(filters.cliente)) return false;
    if (!machineFilterMatches(row, filters.maquina)) return false;
    if (filters.busca && !row.texto.includes(filters.busca.toLowerCase().trim())) return false;
    return true;
  }).sort((a, b) => String(a.data || '').localeCompare(String(b.data || '')) || String(a.codigo || '').localeCompare(String(b.codigo || '')));
}
