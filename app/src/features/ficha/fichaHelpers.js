import { localISODate, machineForFuncionario } from '../../lib/reports.js';

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
    material: seed.material || '',
    barreiro: seed.barreiro || '',
    diaria: seed.diaria || 'completa',
    cli_id: seed.cli_id || '',
    cliente: seed.cliente || '',
    endereco: seed.endereco || '',
    tel: seed.tel || '',
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
    maquina: current.maquina || '',
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
  const funcionario = data?.funcionarios?.find((item) => item.nome === operatorName);
  if (!funcionario) return { nome: '', placa: '', padrao: '' };
  const equipamento = data?.equipamentos?.find((item) => funcionario.maquina && item.nome === funcionario.maquina)
    || data?.equipamentos?.find((item) => item.operador === funcionario.nome);
  return {
    nome: equipamento?.nome || machineForFuncionario(funcionario, data),
    placa: equipamento?.placa || '',
    padrao: equipamento?.nome || funcionario.maquina || '',
  };
}

export function fichaPayload(values, data) {
  const operatorMachine = machineInfoForOperator(values.operador, data);
  const maquina = values.maquina || operatorMachine.nome || '';
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
  const quantidade = isDiaria
    ? (service.diaria === 'meia' ? 0.5 : 1)
    : (service.quantidade === '' || service.quantidade === null ? null : Number(service.quantidade));
  return {
    ficha_id: fichaId,
    tipo: service.tipo || 'metragem',
    quantidade,
    material: isDiaria ? null : service.material || null,
    barreiro: isDiaria ? null : service.barreiro || null,
    diaria: isDiaria ? service.diaria || 'completa' : null,
    cliente: cliente?.fantasia || cliente?.nome || service.cliente || null,
    cli_id: service.cli_id || null,
    nota_pedido: service.nota_pedido || null,
    endereco: service.endereco || cliente?.cidade || null,
    tel: service.tel || cliente?.tel || null,
    pago: Boolean(service.pago),
    valor: service.valor === '' || service.valor === null ? null : Number(service.valor),
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
    || service.pago
    || service.tipo === 'diaria'
  );
}
