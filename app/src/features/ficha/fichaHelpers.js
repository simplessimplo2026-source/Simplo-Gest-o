import { equipamentoForFuncionario, funcionarioByName, isMissingMachineValue, localISODate, machineForFuncionario } from '../../lib/reports.js';
import { MATERIAL_UNIT_OPTIONS, firstMeasureValue, hasAnyMeasure } from '../../lib/units.js';

export function todayISO() {
  return localISODate();
}

export function newService(seed = {}) {
  return {
    localId: seed.localId || crypto.randomUUID(),
    id: seed.id || '',
    nota_pedido: seed.nota_pedido || seed.pedido_numero || seed.n_pedido || '',
    tipo: seed.tipo || 'metragem',
    quantidade: seed.quantidade ?? '',
    qtd_m3: seed.qtd_m3 ?? (seed.tipo === 'metragem' ? seed.quantidade ?? '' : ''),
    qtd_m2: seed.qtd_m2 ?? '',
    qtd_kg: seed.qtd_kg ?? '',
    qtd_litro: seed.qtd_litro ?? '',
    qtd_unidade: seed.qtd_unidade ?? (seed.tipo === 'quantidade' ? seed.quantidade ?? '' : ''),
    material: seed.material || '',
    barreiro: seed.barreiro || '',
    diaria: seed.diaria || 'completa',
    horas_trabalhadas: seed.horas_trabalhadas || '',
    hora_manha_ini: seed.hora_manha_ini || '',
    hora_manha_fim: seed.hora_manha_fim || '',
    hora_tarde_ini: seed.hora_tarde_ini || '',
    hora_tarde_fim: seed.hora_tarde_fim || '',
    cli_id: seed.cli_id || '',
    cliente: seed.cliente || '',
    endereco: seed.endereco || '',
    tel: seed.tel || '',
    contrato_id: seed.contrato_id || '',
    contrato_nome: seed.contrato_nome || '',
    modelo_cobranca: seed.modelo_cobranca || seed.tipo || '',
    valor_unitario: seed.valor_unitario ?? '',
    valor_total: seed.valor_total ?? seed.valor ?? '',
    pago: Boolean(seed.pago),
    valor: seed.valor ?? '',
    tipo_pagamento: seed.tipo_pagamento || '',
  };
}

export function fichaInitialValues(ficha = {}) {
  const current = ficha || {};
  return {
    id: current.id || '',
    data: current.data || todayISO(),
    codigo: current.codigo || '',
    turno: current.turno || 'Dia completo',
    operador: current.operador || '',
    maquina: isMissingMachineValue(current.maquina) ? '' : current.maquina || '',
    maquinaMotivo: current.maquina_motivo || current.motivo_troca || '',
    manha_ini: current.manha_ini || '',
    manha_fim: current.manha_fim || '',
    tarde_ini: current.tarde_ini || '',
    tarde_fim: current.tarde_fim || '',
    hor_ini: current.hor_ini || '',
    hor_fim: current.hor_fim || '',
    km_ini: current.km_ini || '',
    km_fim: current.km_fim || '',
    diesel: current.diesel || '',
    posto: current.posto || '',
    observacoes: current.observacoes || '',
  };
}

export function machineInfoForOperator(operatorName, data) {
  const funcionario = funcionarioByName(operatorName, data);
  if (!funcionario) return { nome: '', placa: '', padrao: '' };
  const equipamento = equipamentoForFuncionario(funcionario, data);
  const fallback = machineForFuncionario(funcionario, data);
  const fallbackName = isMissingMachineValue(fallback) ? '' : fallback;
  return {
    nome: equipamento?.nome || fallbackName,
    placa: equipamento?.placa || '',
    padrao: equipamento?.nome || fallbackName || funcionario.maquina || '',
  };
}

function parseOptionalNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
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

function serviceHoursDecimal(service) {
  const minutes = rangeMinutes(service.hora_manha_ini, service.hora_manha_fim)
    + rangeMinutes(service.hora_tarde_ini, service.hora_tarde_fim);
  return minutes ? Number((minutes / 60).toFixed(2)) : parseOptionalNumber(service.quantidade);
}

function serviceChargeTotal(service, quantidade) {
  const unitValue = parseOptionalNumber(service.valor_unitario);
  if (!unitValue || !quantidade) return parseOptionalNumber(service.valor_total || service.valor);
  return Number((unitValue * quantidade).toFixed(2));
}

export function fichaPayload(values, data) {
  const operatorMachine = machineInfoForOperator(values.operador, data);
  const manualMachine = isMissingMachineValue(values.maquina) ? '' : values.maquina;
  const maquina = manualMachine || operatorMachine.nome || '';
  return {
    data: values.data || todayISO(),
    codigo: values.codigo || null,
    turno: values.turno || 'Dia completo',
    operador: values.operador || null,
    maquina: maquina || null,
    maquina_motivo: values.maquinaMotivo || null,
    manha_ini: values.manha_ini || null,
    manha_fim: values.manha_fim || null,
    tarde_ini: values.tarde_ini || null,
    tarde_fim: values.tarde_fim || null,
    hor_ini: values.hor_ini || null,
    hor_fim: values.hor_fim || null,
    km_ini: values.km_ini || null,
    km_fim: values.km_fim || null,
    diesel: values.diesel || null,
    posto: values.posto || null,
    observacoes: values.observacoes || null,
  };
}

export function servicePayload(service, fichaId, data) {
  const cliente = data?.clientes?.find((item) => String(item.id) === String(service.cli_id));
  const isDiaria = service.tipo === 'diaria';
  const isHora = service.tipo === 'hora';
  const quantidade = isDiaria
    ? (service.diaria === 'meia' ? 0.5 : 1)
    : isHora
      ? serviceHoursDecimal(service)
      : parseOptionalNumber(firstMeasureValue(service) || service.quantidade);
  const measurePayload = MATERIAL_UNIT_OPTIONS.reduce((acc, unit) => {
    acc[unit.field] = isDiaria || isHora ? null : parseOptionalNumber(service[unit.field]);
    return acc;
  }, {});
  const valorTotal = serviceChargeTotal(service, quantidade);
  return {
    ficha_id: fichaId,
    tipo: service.tipo || 'metragem',
    quantidade,
    ...measurePayload,
    material: isDiaria || isHora ? null : service.material || null,
    barreiro: isDiaria || isHora ? null : service.barreiro || null,
    diaria: isDiaria ? service.diaria || 'completa' : null,
    horas_trabalhadas: null,
    hora_manha_ini: isHora ? service.hora_manha_ini || null : null,
    hora_manha_fim: isHora ? service.hora_manha_fim || null : null,
    hora_tarde_ini: isHora ? service.hora_tarde_ini || null : null,
    hora_tarde_fim: isHora ? service.hora_tarde_fim || null : null,
    cliente: cliente?.fantasia || cliente?.nome || service.cliente || null,
    cli_id: service.cli_id || null,
    nota_pedido: service.nota_pedido || null,
    endereco: service.endereco || cliente?.cidade || null,
    tel: service.tel || cliente?.tel || null,
    contrato_id: service.contrato_id || null,
    contrato_nome: service.contrato_nome || null,
    modelo_cobranca: service.modelo_cobranca || service.tipo || null,
    valor_unitario: parseOptionalNumber(service.valor_unitario),
    valor_total: valorTotal,
    pago: Boolean(service.pago),
    valor: valorTotal,
    tipo_pagamento: service.pago ? service.tipo_pagamento || null : null,
  };
}

export function hasServiceContent(service) {
  return Boolean(
    service.nota_pedido
    || service.cli_id
    || service.material
    || service.barreiro
    || service.quantidade
    || hasAnyMeasure(service)
    || service.contrato_id
    || service.valor_unitario
    || service.valor_total
    || service.hora_manha_ini
    || service.hora_manha_fim
    || service.hora_tarde_ini
    || service.hora_tarde_fim
    || service.pago
    || service.tipo === 'diaria'
    || service.tipo === 'hora'
  );
}
